from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import List, Dict
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
    await websocket.accept()
    if expert_id not in expert_connections:
        expert_connections[expert_id] = []
    expert_connections[expert_id].append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        expert_connections[expert_id].remove(websocket)
        if not expert_connections[expert_id]:
            del expert_connections[expert_id]

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

class PrescriptionRequest(BaseModel):
    farmer_id: str
    diagnosis: str
    prescribed_products: List[str] # List of Product IDs
    notes: str

class CallRequest(BaseModel):
    expert_id: str


@router.get("/experts", response_model=List[ExpertResponse])
async def get_experts(db = Depends(get_mongo_db)):
    """Returns a list of all users with AGRONOMY_EXPERT role."""
    experts = await db["users"].find({"role": UserRole.AGRONOMY_EXPERT.value}).to_list(length=100)
    
    expert_list = []
    # If no experts are in the DB yet, we return an empty array gracefully
    if not experts:
        return []
        
    for e in experts:
        expert_list.append({
            "id": str(e.get("id")),
            "name": e.get("name"),
            "title": "Agronomy Expert",
            "rating": 4.8,
            "img": f"https://ui-avatars.com/api/?name={e.get('name')}&background=random",
            "price": 350.0,
            "lang": "English, Local"
        })
    return expert_list

@router.get("/triage/{farmer_id}", response_model=TriageSummaryResponse)
async def get_triage_summary(farmer_id: str, current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Aggregates a farmer's recent scans to create an AI Triage for the Expert."""
    # Fetch last 5 scans
    cursor = db["disease_reports"].find({"user_id": farmer_id}).sort("created_at", -1).limit(5)
    scans = await cursor.to_list(length=5)
    
    if not scans:
        return {
            "farmer_id": farmer_id,
            "farmer_name": "Farmer",
            "total_scans": 0,
            "most_common_disease": "None",
            "recent_scans": [],
            "ai_recommendation_summary": "No scanning history available for this farmer."
        }
        
    diseases = [s.get("disease_name", "Unknown") for s in scans]
    most_common = max(set(diseases), key=diseases.count) if diseases else "Unknown"
    
    # Simple summary generation
    summary = f"Farmer has scanned {len(scans)} crops recently. "
    summary += f"The most frequent detection is {most_common.replace('___', ' ')}. "
    summary += "Please review the latest scan images before issuing a prescription."

    # Serialize scans (convert ObjectId to string)
    serialized_scans = []
    for s in scans:
        s["_id"] = str(s["_id"])
        serialized_scans.append(s)

    return {
        "farmer_id": farmer_id,
        "farmer_name": "Farmer", # Could fetch actual name from MongoDB
        "total_scans": len(scans),
        "most_common_disease": most_common.replace("___", " "),
        "recent_scans": serialized_scans,
        "ai_recommendation_summary": summary
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
    cursor = db["prescriptions"].find({"farmer_id": str(current_user.id)}).sort("created_at", -1)
    prescriptions = await cursor.to_list(length=20)
    
    result = []
    for p in prescriptions:
        p["_id"] = str(p["_id"])
        result.append(p)
    return result

@router.post("/call")
async def initiate_call(req: CallRequest, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Farmer initiates a call to an expert."""
    room_name = f"CropAI_Consult_{req.expert_id}_{str(current_user.id)}_{int(datetime.now(timezone.utc).timestamp())}"
    
    call_doc = {
        "farmer_id": str(current_user.id),
        "expert_id": req.expert_id,
        "room_name": room_name,
        "status": "calling",
        "created_at": datetime.now(timezone.utc)
    }
    
    res = await db["active_calls"].insert_one(call_doc)
    call_id = str(res.inserted_id)
    
    # Notify expert instantly via WebSocket instead of waiting for them to poll
    if req.expert_id in expert_connections:
        call_msg = {
            "type": "incoming_call",
            "id": call_id,
            "farmer_id": call_doc["farmer_id"],
            "room_name": room_name
        }
        for ws in expert_connections[req.expert_id]:
            try:
                await ws.send_json(call_msg)
            except Exception:
                pass
                
    return {"room_name": room_name}

@router.get("/active-calls")
async def get_active_calls(current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Expert polls this to see if any farmer is currently calling them."""
    # Find calls targeting this expert that are still in "calling" state
    cursor = db["active_calls"].find({
        "expert_id": str(current_user.id),
        "status": "calling"
    }).sort("created_at", -1)
    
    calls = await cursor.to_list(length=10)
    
    result = []
    for c in calls:
        result.append({
            "id": str(c["_id"]),
            "farmer_id": c["farmer_id"],
            "room_name": c["room_name"],
            "created_at": c["created_at"]
        })
    return result

@router.post("/call/{call_id}/accept")
async def accept_call(call_id: str, current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Expert accepts the call, removing it from the ringing queue."""
    await db["active_calls"].update_one(
        {"_id": ObjectId(call_id)},
        {"$set": {"status": "accepted"}}
    )
    return {"message": "Call accepted"}
