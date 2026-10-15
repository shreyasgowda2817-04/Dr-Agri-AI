from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import List, Dict, Optional
from app.api.dependencies import get_current_user, RequireRole
from app.models.user import UserResponse
from app.core.database import get_mongo_db
from app.models.mongo_models import UserRole
from pydantic import BaseModel
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter()

# In-memory map of expert_id -> List of WebSockets
expert_connections: Dict[str, List[WebSocket]] = {}

@router.websocket("/ws/experts/{expert_id}")
async def expert_call_signaling(websocket: WebSocket, expert_id: str):
    print(f"DEBUG: WebSocket connection attempt for expert {expert_id}")
    await websocket.accept()
    print(f"DEBUG: WebSocket connected for expert {expert_id}")
    if expert_id not in expert_connections:
        expert_connections[expert_id] = []
    expert_connections[expert_id].append(websocket)
    print(f"DEBUG: Active connections for {expert_id}: {len(expert_connections[expert_id])}")
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        print(f"DEBUG: WebSocket disconnected for expert {expert_id}")
        expert_connections[expert_id].remove(websocket)
        if not expert_connections[expert_id]:
            del expert_connections[expert_id]

@router.get("/debug-ws")
async def debug_ws():
    return {"active_ws_experts": list(expert_connections.keys())}

class ExpertResponse(BaseModel):
    id: str
    name: str
    title: str
    rating: float
    price: float
    lang: str
    img: str

class TriageSummaryResponse(BaseModel):
    farmer_id: str
    farmer_name: str
    total_scans: int
    most_common_disease: str
    recent_scans: List[dict]
    ai_recommendation_summary: str
    farm_details: Optional[dict] = None
    risk_level: str = "Low"
    average_confidence: float = 0.0
    environmental_factors: Optional[dict] = None

class PrescriptionRequest(BaseModel):
    farmer_id: str
    diagnosis: str
    prescribed_products: List[str] # List of Product IDs
    notes: str

class CallRequest(BaseModel):
    expert_id: str
    call_type: str = "video"

class ReviewRequest(BaseModel):
    rating: int
    comment: Optional[str] = None


@router.get("/experts", response_model=List[ExpertResponse])
async def get_experts(db = Depends(get_mongo_db)):
    """Returns a list of all users with AGRONOMY_EXPERT role."""
    experts = await db["users"].find({"role": UserRole.AGRONOMY_EXPERT.value}).to_list(length=100)
    
    expert_list = []
    # If no experts are in the DB yet, we return an empty array gracefully
    if not experts:
        return []
        
    for e in experts:
        expert_id = e.get("id") or str(e.get("_id"))
        e["id"] = expert_id
        
        # Calculate real average rating from database
        pipeline = [
            {"$match": {"expert_id": expert_id}},
            {"$group": {"_id": "$expert_id", "avg_rating": {"$avg": "$rating"}}}
        ]
        cursor = db["reviews"].aggregate(pipeline)
        result = await cursor.to_list(length=1)
        avg_rating = result[0]["avg_rating"] if result else 0.0
        
        expert_list.append({
            "id": expert_id,
            "name": e.get("name"),
            "title": "Agronomy Expert",
            "rating": round(avg_rating, 1),
            "img": f"https://ui-avatars.com/api/?name={e.get('name').replace(' ', '+') if e.get('name') else 'Expert'}&background=random",
            "price": 0.0,
            "lang": e.get("languages", "English, Local")
        })
    return expert_list

@router.post("/call/{call_id}/review")
async def submit_review(
    call_id: str,
    req: ReviewRequest,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Farmer submits a genuine rating after a call."""
    call = await db["active_calls"].find_one({"_id": ObjectId(call_id)})
    if not call:
        raise HTTPException(status_code=404, detail="Call session not found")
        
    review_doc = {
        "call_id": call_id,
        "expert_id": call["expert_id"],
        "farmer_id": str(current_user.id),
        "rating": req.rating,
        "comment": req.comment,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db["reviews"].insert_one(review_doc)
    return {"message": "Review submitted successfully"}

@router.get("/triage/{farmer_id}", response_model=TriageSummaryResponse)
async def get_triage_summary(farmer_id: str, current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Aggregates a farmer's recent scans to create an AI Triage for the Expert."""
    # Fetch farmer profile to get name and farm details
    from bson.errors import InvalidId
    farmer_doc = await db["users"].find_one({"id": farmer_id})
    if not farmer_doc:
        try:
            farmer_doc = await db["users"].find_one({"_id": ObjectId(farmer_id)})
        except:
            pass
            
    farmer_name = farmer_doc.get("name", "Farmer") if farmer_doc else "Farmer"
    farm_details = farmer_doc.get("farm_details", {}) if farmer_doc else {}

    # Fetch last 10 scans for deeper analysis
    cursor = db["disease_reports"].find({"user_id": farmer_id}).sort("created_at", 1).limit(10)
    scans = await cursor.to_list(length=10)
    
    if not scans:
        return {
            "farmer_id": farmer_id,
            "farmer_name": farmer_name,
            "total_scans": 0,
            "most_common_disease": "None",
            "recent_scans": [],
            "ai_recommendation_summary": "No scanning history available for this farmer.",
            "farm_details": farm_details,
            "risk_level": "Low",
            "average_confidence": 0.0,
            "environmental_factors": {"temperature": "24°C", "humidity": "60%", "forecast": "Clear"}
        }
        
    diseases = [s.get("disease_name", "Unknown") for s in scans if s.get("disease_name") != "healthy"]
    most_common = max(set(diseases), key=diseases.count) if diseases else "Healthy"
    
    # Calculate confidence and risk
    confidences = [s.get("confidence", 0) for s in scans if "confidence" in s]
    avg_conf = sum(confidences) / len(confidences) if confidences else 0.85
    
    # Determine risk level based on recent scan frequency and severity
    risk_level = "Low"
    if len(diseases) > 5:
        risk_level = "High"
    elif len(diseases) > 2:
        risk_level = "Medium"
        
    # Generate Advanced Summary
    summary = f"Detected {len(scans)} recent scans. "
    if most_common != "Healthy":
        summary += f"The AI indicates a severe spread of {most_common.replace('___', ' ')} (Risk: {risk_level.upper()}). "
        if risk_level == "High":
            summary += "Immediate intervention and broad-spectrum fungicide recommended based on environmental humidity."
    else:
        summary += "Crops appear mostly healthy, routine monitoring advised."

    serialized_scans = []
    for s in scans:
        s["_id"] = str(s["_id"])
        serialized_scans.append(s)

    return {
        "farmer_id": farmer_id,
        "farmer_name": farmer_name,
        "total_scans": len(scans),
        "most_common_disease": most_common.replace("___", " "),
        "recent_scans": serialized_scans,
        "ai_recommendation_summary": summary,
        "farm_details": farm_details,
        "risk_level": risk_level,
        "average_confidence": round(avg_conf, 2),
        "environmental_factors": {"temperature": "28°C", "humidity": "78%", "forecast": "High Risk of Fungal Spread"}
    }

@router.post("/prescriptions")
async def issue_prescription(req: PrescriptionRequest, current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Expert issues a prescription. This will show up on the Farmer's dashboard to add to cart."""
    prescription_doc = {
        "expert_id": str(current_user.id),
        "farmer_id": req.farmer_id,
        "diagnosis": req.diagnosis,
        "prescribed_products": req.prescribed_products,
        "notes": req.notes,
        "status": "issued",
        "created_at": datetime.now(timezone.utc)
    }
    
    res = await db["prescriptions"].insert_one(prescription_doc)
    return {"message": "Prescription issued successfully", "id": str(res.inserted_id)}

@router.get("/prescriptions")
async def get_prescriptions(current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Farmer retrieves their own prescriptions."""
    cursor = db["prescriptions"].find({"farmer_id": str(current_user.id)}).sort("created_at", 1)
    prescriptions = await cursor.to_list(length=20)
    
    result = []
    for p in prescriptions:
        p["_id"] = str(p["_id"])
        result.append(p)
    return result

@router.post("/call")
async def initiate_call(req: CallRequest, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Farmer initiates a call to an expert."""
    safe_farmer_id = str(current_user.id).replace("-", "").lower()[:6]
    safe_expert_id = str(req.expert_id).replace("-", "").lower()[:6]
    room_name = f"dragriai{safe_expert_id}{safe_farmer_id}{int(datetime.now(timezone.utc).timestamp())}"
    
    call_doc = {
        "farmer_id": str(current_user.id),
        "expert_id": req.expert_id,
        "room_name": room_name,
        "call_type": req.call_type,
        "status": "calling",
        "created_at": datetime.now(timezone.utc)
    }
    
    print(f"DEBUG: Created call for expert_id={req.expert_id} from farmer_id={current_user.id}")
    res = await db["active_calls"].insert_one(call_doc)
    call_id = str(res.inserted_id)
    
    # Notify expert instantly via WebSocket instead of waiting for them to poll
    if req.expert_id in expert_connections:
        call_msg = {
            "type": "incoming_call",
            "id": call_id,
            "farmer_id": call_doc["farmer_id"],
            "room_name": room_name,
            "call_type": req.call_type
        }
        for ws in expert_connections[req.expert_id]:
            try:
                await ws.send_json(call_msg)
            except Exception:
                pass
                
    return {"room_name": room_name, "call_id": str(res.inserted_id)}

@router.get("/active-calls")
async def get_active_calls(current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Expert polls this to see if any farmer is currently calling them."""
    # Find calls targeting this expert that are still in "calling" state
    print(f"DEBUG: get_active_calls for expert_id={current_user.id}")
    
    # Try both id formats just in case!
    cursor = db["active_calls"].find({
        "$or": [
            {"expert_id": str(current_user.id)},
            {"expert_id": str(current_user.id).replace("-", "")},
        ],
        "status": "calling"
    }).sort("created_at", 1)
    
    calls = await cursor.to_list(length=10)
    if calls: print(f"DEBUG: Found {len(calls)} calls for expert {current_user.id}")
    
    result = []
    for c in calls:
        result.append({
            "id": str(c["_id"]),
            "farmer_id": c["farmer_id"],
            "room_name": c["room_name"],
            "call_type": c.get("call_type", "video"),
            "created_at": c["created_at"]
        })
    return result

@router.post("/call/{call_id}/accept")
async def accept_call(call_id: str, current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Expert accepts the call. Uses atomic findOneAndUpdate to prevent duplicate pickups."""
    result = await db["active_calls"].find_one_and_update(
        {"_id": ObjectId(call_id), "status": "calling"},
        {"$set": {"status": "accepted", "accepted_by": str(current_user.id), "accepted_at": datetime.now(timezone.utc)}}
    )
    if not result:
        raise HTTPException(status_code=400, detail="Call already accepted or cancelled.")
    return {"message": "Call accepted"}

@router.post("/call/{call_id}/decline")
async def decline_call(call_id: str, current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Expert declines the call."""
    await db["active_calls"].update_one(
        {"_id": ObjectId(call_id)},
        {"$set": {"status": "declined"}}
    )
    return {"message": "Call declined"}
