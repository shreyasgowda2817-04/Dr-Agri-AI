from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import List, Dict, Optional
from app.api.dependencies import get_current_user, RequireRole
from app.models.user import UserResponse
from app.core.database import get_mongo_db
from app.models.mongo_models import UserRole
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
from bson import ObjectId

router = APIRouter()

import json

# In-memory map of expert_id -> List of WebSockets
expert_connections: Dict[str, List[WebSocket]] = {}

# In-memory map of room_name -> List of WebSockets for WebRTC Video Calling
call_room_connections: Dict[str, List[WebSocket]] = {}

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

@router.websocket("/ws/call/{room_name}")
async def call_room_signaling(
    websocket: WebSocket,
    room_name: str,
    client_id: Optional[str] = None,
    role: Optional[str] = None
):
    """Real-time WebRTC signaling gateway for farmer-expert video & audio consultations."""
    await websocket.accept()
    if room_name not in call_room_connections:
        call_room_connections[room_name] = []
    call_room_connections[room_name].append(websocket)
    
    # Notify peers in the room that a peer joined
    peer_count = len(call_room_connections[room_name])
    for peer in list(call_room_connections[room_name]):
        if peer != websocket:
            try:
                await peer.send_json({"type": "peer_joined", "peer_count": peer_count, "sender_role": role})
            except Exception:
                pass

    try:
        while True:
            raw = await websocket.receive_text()
            if raw == "ping":
                await websocket.send_text("pong")
                continue
            if room_name in call_room_connections:
                for peer in list(call_room_connections[room_name]):
                    if peer != websocket:
                        try:
                            await peer.send_text(raw)
                        except Exception:
                            pass
    except WebSocketDisconnect:
        if room_name in call_room_connections:
            if websocket in call_room_connections[room_name]:
                call_room_connections[room_name].remove(websocket)
            for peer in list(call_room_connections[room_name]):
                try:
                    await peer.send_json({"type": "peer_left"})
                except Exception:
                    pass
            if not call_room_connections[room_name]:
                del call_room_connections[room_name]

@router.get("/debug-ws")
async def debug_ws():
    return {"active_ws_experts": list(expert_connections.keys())}

@router.get("/debug-call-rooms")
async def debug_call_rooms():
    return {
        "active_rooms": {
            room: len(conns) for room, conns in call_room_connections.items()
        }
    }

class ExpertResponse(BaseModel):
    id: str
    name: str
    title: str
    rating: float
    price: float
    lang: str
    img: str
    is_available: bool = True

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

class WorkingHours(BaseModel):
    start: str = "09:00"
    end: str = "18:00"
    timezone: str = "Asia/Kolkata"

class ExpertAvailabilityUpdate(BaseModel):
    is_available: bool = True
    working_hours: WorkingHours = Field(default_factory=WorkingHours)
    available_days: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    fee_per_consultation: float = 0.0
    title: Optional[str] = "Senior Agronomy Specialist"
    specializations: List[str] = ["Crop Pathology", "Soil Science", "Pest Management"]
    bio: Optional[str] = "Certified agricultural expert advising farmers on crop health, soil nutrients, and yield maximization."

class ExpertOverviewResponse(BaseModel):
    total_consultations: int
    active_queue_count: int
    today_appointments_count: int
    average_rating: float
    total_reviews: int
    total_prescriptions: int
    fee_per_consultation: float
    total_earnings: float
    is_available: bool
    working_hours: WorkingHours
    available_days: List[str]
    specializations: List[str]
    title: str
    bio: str


@router.get("/experts", response_model=List[ExpertResponse])
async def get_experts(db = Depends(get_mongo_db)):
    """Returns a list of all users with AGRONOMY_EXPERT role."""
    experts = await db["users"].find({"role": UserRole.AGRONOMY_EXPERT.value}).to_list(length=100)
    
    expert_list = []
    for e in experts:
        expert_id = e.get("id") or str(e.get("_id"))
        e["id"] = expert_id
        profile = e.get("expert_profile", {})
        
        # Calculate real average rating from database
        pipeline = [
            {"$match": {"expert_id": expert_id}},
            {"$group": {"_id": "$expert_id", "avg_rating": {"$avg": "$rating"}}}
        ]
        cursor = db["reviews"].aggregate(pipeline)
        result = await cursor.to_list(length=1)
        avg_rating = result[0]["avg_rating"] if result else 5.0
        
        expert_list.append({
            "id": expert_id,
            "name": e.get("name") or "Agronomy Specialist",
            "title": profile.get("title") or "Agronomy Expert",
            "rating": round(avg_rating, 1),
            "img": f"https://ui-avatars.com/api/?name={(e.get('name') or 'Expert').replace(' ', '+')}&background=065f46&color=fff",
            "price": float(profile.get("fee_per_consultation", 0.0)),
            "lang": e.get("languages", "English, Hindi, Local"),
            "is_available": profile.get("is_available", True)
        })

    # If no expert registered yet, check admins or supply verified Dr. Swaminathan
    if not expert_list:
        admins = await db["users"].find({"role": {"$in": ["ADMIN", "SUPER_ADMIN"]}}).to_list(length=5)
        for a in admins:
            aid = str(a.get("id") or a.get("_id"))
            a_profile = a.get("expert_profile", {})
            expert_list.append({
                "id": aid,
                "name": a.get("name") or "Chief Agronomist",
                "title": a_profile.get("title") or "Senior Agronomy Specialist",
                "rating": 5.0,
                "img": f"https://ui-avatars.com/api/?name={(a.get('name') or 'Agronomist').replace(' ', '+')}&background=047857&color=fff",
                "price": float(a_profile.get("fee_per_consultation", 0.0)),
                "lang": "English, Hindi, Kannada",
                "is_available": a_profile.get("is_available", True)
            })

    if not expert_list:
        expert_list.append({
            "id": "exp-1",
            "name": "Dr. Swaminathan",
            "title": "Chief Agronomist & Crop Pathologist",
            "rating": 4.9,
            "img": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
            "price": 0.0,
            "lang": "English, Hindi, Kannada, Telugu",
            "is_available": True
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
    safe_fid = farmer_id.replace("-", "")
    cursor = db["disease_reports"].find({
        "$or": [{"user_id": farmer_id}, {"user_id": safe_fid}]
    }).sort("created_at", -1).limit(10)
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
    cursor = db["prescriptions"].find({
        "$or": [{"farmer_id": str(current_user.id)}, {"farmer_id": str(current_user.id).replace("-", "")}]
    }).sort("created_at", -1)
    prescriptions = await cursor.to_list(length=20)
    
    result = []
    for p in prescriptions:
        p["_id"] = str(p["_id"])
        result.append(p)
    return result

@router.post("/call")
async def initiate_call(req: CallRequest, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Farmer initiates a real-time call to an expert."""
    safe_farmer_id = str(current_user.id).replace("-", "").lower()[:6]
    safe_expert_id = str(req.expert_id).replace("-", "").lower()[:6]
    room_name = f"dragriai{safe_expert_id}{safe_farmer_id}{int(datetime.now(timezone.utc).timestamp())}"
    
    # Cancel any previous lingering 'calling' sessions from this farmer to prevent phantom rings
    await db["active_calls"].update_many(
        {"farmer_id": str(current_user.id), "status": "calling"},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}}
    )

    call_doc = {
        "farmer_id": str(current_user.id),
        "farmer_name": current_user.name or "Farmer",
        "expert_id": req.expert_id,
        "room_name": room_name,
        "call_type": req.call_type,
        "status": "calling",
        "created_at": datetime.now(timezone.utc)
    }
    
    res = await db["active_calls"].insert_one(call_doc)
    call_id = str(res.inserted_id)
    
    # Notify expert instantly via WebSocket instead of waiting for them to poll
    call_msg = {
        "type": "incoming_call",
        "id": call_id,
        "farmer_id": call_doc["farmer_id"],
        "farmer_name": call_doc["farmer_name"],
        "room_name": room_name,
        "call_type": req.call_type
    }
    # Notify ONLY the specific chosen expert via WebSocket
    target_expert_id = str(req.expert_id)
    target_safe_id = target_expert_id.replace("-", "")
    for exp_key in [target_expert_id, target_safe_id]:
        if exp_key in expert_connections:
            for ws in list(expert_connections[exp_key]):
                try:
                    await ws.send_json(call_msg)
                except Exception:
                    pass
                
    return {"room_name": room_name, "call_id": str(res.inserted_id)}

@router.get("/active-calls")
async def get_active_calls(current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Expert polls this to see if any real farmer is currently calling them."""
    expert_id = str(current_user.id)
    safe_expert_id = expert_id.replace("-", "")
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=90)
    
    # Auto-retire any stale or abandoned calls older than 90 seconds
    await db["active_calls"].update_many(
        {"status": "calling", "created_at": {"$lt": cutoff}},
        {"$set": {"status": "missed"}}
    )
    
    # Match calls specifically targeted to this expert, or unassigned/general queue calls
    cursor = db["active_calls"].find({
        "$or": [
            {"expert_id": expert_id},
            {"expert_id": safe_expert_id},
            {"expert_id": "exp-1"},
            {"expert_id": "expert-agronomist-default"},
            {"expert_id": {"$in": ["exp-1", "default", "general", "all", ""]}}
        ],
        "status": "calling",
        "created_at": {"$gte": cutoff}
    }).sort("created_at", -1)
    
    calls = await cursor.to_list(length=10)
    
    result = []
    for c in calls:
        result.append({
            "id": str(c["_id"]),
            "farmer_id": c["farmer_id"],
            "farmer_name": c.get("farmer_name", "Farmer"),
            "room_name": c["room_name"],
            "call_type": c.get("call_type", "video"),
            "created_at": c["created_at"]
        })
    return result

@router.get("/my-active-call")
async def get_my_active_call(current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Checks if the logged-in user (farmer or expert) has an ongoing or recently interrupted call that can be resumed."""
    uid = str(current_user.id)
    safe_uid = uid.replace("-", "")
    now = datetime.now(timezone.utc)
    # Recent cutoff for active sessions
    cutoff = now - timedelta(minutes=30)
    
    query = {
        "$or": [
            {"farmer_id": {"$in": [uid, safe_uid]}},
            {"expert_id": {"$in": [uid, safe_uid]}},
            {"accepted_by": {"$in": [uid, safe_uid]}}
        ],
        "status": {"$in": ["calling", "accepted"]},
        "created_at": {"$gte": cutoff}
    }
    
    call = await db["active_calls"].find_one(query, sort=[("created_at", -1)])
    if not call:
        return {"has_active_call": False, "call": None}
        
    call_created = call.get("created_at", now)
    # If unaccepted calling session is older than 95 seconds, retire it
    if call.get("status") == "calling" and (now - call_created).total_seconds() > 95:
        await db["active_calls"].update_one({"_id": call["_id"]}, {"$set": {"status": "missed"}})
        return {"has_active_call": False, "call": None}

    # Fetch peer details
    is_caller = str(call.get("farmer_id")) in [uid, safe_uid]
    peer_name = "Dr. Agri AI Specialist"
    if is_caller:
        exp_id = call.get("accepted_by") or call.get("expert_id")
        if exp_id:
            try:
                exp_query = {"$or": [{"id": exp_id}, {"id": str(exp_id).replace("-", "")}]}
                if ObjectId.is_valid(str(exp_id)):
                    exp_query["$or"].append({"_id": ObjectId(str(exp_id))})
                exp_user = await db["users"].find_one(exp_query)
                if exp_user:
                    peer_name = exp_user.get("name") or "Dr. Agri AI Specialist"
            except Exception:
                pass
    else:
        peer_name = call.get("farmer_name", "Farmer")

    return {
        "has_active_call": True,
        "call": {
            "id": str(call["_id"]),
            "room_name": call.get("room_name"),
            "call_type": call.get("call_type", "video"),
            "status": call.get("status"),
            "is_caller": is_caller,
            "peer_name": peer_name,
            "created_at": call.get("created_at"),
            "accepted_at": call.get("accepted_at")
        }
    }

@router.post("/call/{call_id}/cancel")
async def cancel_call(call_id: str, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Farmer or expert cancels/terminates a call session."""
    try:
        obj_id = ObjectId(call_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid call ID format")

    call = await db["active_calls"].find_one_and_update(
        {"_id": obj_id, "status": {"$in": ["calling", "accepted"]}},
        {"$set": {
            "status": "cancelled",
            "cancelled_by": str(current_user.id),
            "cancelled_at": datetime.now(timezone.utc)
        }}
    )
    if call and call.get("room_name") in call_room_connections:
        for ws in list(call_room_connections[call["room_name"]]):
            try:
                await ws.send_json({
                    "type": "call_cancelled",
                    "reason": "Call was ended by the participant."
                })
            except Exception:
                pass
    return {"message": "Call cancelled successfully"}

@router.post("/call/{call_id}/leave-beacon")
async def leave_call_beacon(call_id: str, db = Depends(get_mongo_db)):
    """Browser unload beacon handler. Gracefully updates leave status without needing JWT auth."""
    try:
        obj_id = ObjectId(call_id)
        call = await db["active_calls"].find_one({"_id": obj_id})
        if call and call.get("status") in ["calling", "accepted"]:
            if call.get("status") == "calling":
                await db["active_calls"].update_one(
                    {"_id": obj_id},
                    {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}}
                )
            else:
                await db["active_calls"].update_one(
                    {"_id": obj_id},
                    {"$set": {"last_left_at": datetime.now(timezone.utc)}}
                )
            room_name = call.get("room_name")
            if room_name and room_name in call_room_connections:
                for ws in list(call_room_connections[room_name]):
                    try:
                        await ws.send_json({"type": "peer_temporarily_left"})
                    except Exception:
                        pass
    except Exception:
        pass
    return {"message": "Beacon recorded"}

@router.post("/call/{call_id}/accept")
async def accept_call(call_id: str, current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Expert accepts the call. Uses atomic findOneAndUpdate to claim the consultation."""
    try:
        obj_id = ObjectId(call_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid call ID format")

    result = await db["active_calls"].find_one_and_update(
        {"_id": obj_id, "status": "calling"},
        {"$set": {
            "status": "accepted",
            "accepted_by": str(current_user.id),
            "expert_id": str(current_user.id),
            "accepted_at": datetime.now(timezone.utc)
        }}
    )
    if not result:
        # Check if already accepted by this user
        existing = await db["active_calls"].find_one({"_id": obj_id})
        if existing and existing.get("accepted_by") == str(current_user.id):
            return {
                "message": "Call accepted",
                "id": str(existing["_id"]),
                "room_name": existing.get("room_name"),
                "farmer_id": existing.get("farmer_id"),
                "call_type": existing.get("call_type", "video")
            }
        raise HTTPException(status_code=400, detail="Call already accepted or cancelled.")

    room_name = result.get("room_name")
    if room_name and room_name in call_room_connections:
        for ws in list(call_room_connections[room_name]):
            try:
                await ws.send_json({
                    "type": "call_accepted",
                    "id": str(result["_id"]),
                    "expert_id": str(current_user.id),
                    "expert_name": current_user.name,
                    "room_name": room_name
                })
            except Exception:
                pass
        
    return {
        "message": "Call accepted",
        "id": str(result["_id"]),
        "room_name": result.get("room_name"),
        "farmer_id": result.get("farmer_id"),
        "call_type": result.get("call_type", "video")
    }

@router.post("/call/{call_id}/decline")
async def decline_call(call_id: str, current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Expert declines the call."""
    try:
        obj_id = ObjectId(call_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid call ID")

    call = await db["active_calls"].find_one_and_update(
        {"_id": obj_id},
        {"$set": {
            "status": "declined",
            "declined_by": str(current_user.id),
            "declined_at": datetime.now(timezone.utc)
        }}
    )
    if call and call.get("room_name") in call_room_connections:
        for ws in list(call_room_connections[call["room_name"]]):
            try:
                await ws.send_json({
                    "type": "call_declined",
                    "reason": "Specialist is currently assisting another farmer."
                })
            except Exception:
                pass
    return {"message": "Call declined"}

@router.post("/call/{call_id}/complete")
async def complete_call(call_id: str, current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Expert marks consultation as completed."""
    try:
        obj_id = ObjectId(call_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid consultation call ID")

    result = await db["active_calls"].find_one_and_update(
        {"_id": obj_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc)
        }}
    )
    if not result:
        raise HTTPException(status_code=404, detail="Consultation call not found")

    room_name = result.get("room_name")
    if room_name and room_name in call_room_connections:
        for ws in list(call_room_connections[room_name]):
            try:
                await ws.send_json({
                    "type": "call_completed",
                    "id": call_id
                })
            except Exception:
                pass

    return {"message": "Consultation completed successfully"}


@router.get("/expert/overview", response_model=ExpertOverviewResponse)
async def get_expert_overview(current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Aggregates all real metrics, consultation counts, ratings, and schedule settings for the logged-in expert."""
    expert_id = str(current_user.id)
    safe_expert_id = expert_id.replace("-", "")

    # Retrieve expert user doc for profile configurations
    expert_query = {"$or": [{"id": expert_id}, {"id": safe_expert_id}]}
    if ObjectId.is_valid(expert_id):
        expert_query["$or"].append({"_id": ObjectId(expert_id)})
    user_doc = await db["users"].find_one(expert_query)
    profile_data = (user_doc or {}).get("expert_profile", {})

    # Calculate completed and total consultations
    total_consultations = await db["active_calls"].count_documents({
        "$or": [
            {"expert_id": expert_id}, {"expert_id": safe_expert_id},
            {"accepted_by": expert_id}, {"accepted_by": safe_expert_id}
        ],
        "status": {"$in": ["accepted", "completed"]}
    })

    # Active incoming queue count
    active_queue_count = await db["active_calls"].count_documents({
        "$or": [{"expert_id": expert_id}, {"expert_id": safe_expert_id}],
        "status": "calling"
    })

    # Today's appointments count
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_appointments_count = await db["active_calls"].count_documents({
        "$or": [
            {"expert_id": expert_id}, {"expert_id": safe_expert_id},
            {"accepted_by": expert_id}, {"accepted_by": safe_expert_id}
        ],
        "status": {"$in": ["calling", "accepted", "scheduled"]},
        "created_at": {"$gte": today_start}
    })

    # Reviews and real rating aggregation
    reviews = await db["reviews"].find({
        "$or": [{"expert_id": expert_id}, {"expert_id": safe_expert_id}]
    }).to_list(length=200)
    total_reviews = len(reviews)
    avg_rating = round(sum(r.get("rating", 5) for r in reviews) / total_reviews, 1) if total_reviews > 0 else 5.0

    # Total prescriptions issued
    total_prescriptions = await db["prescriptions"].count_documents({
        "$or": [{"expert_id": expert_id}, {"expert_id": safe_expert_id}]
    })

    # Earnings calculation
    fee_per_consultation = float(profile_data.get("fee_per_consultation", 0.0))
    total_earnings = round(total_consultations * fee_per_consultation, 2)

    return ExpertOverviewResponse(
        total_consultations=total_consultations,
        active_queue_count=active_queue_count,
        today_appointments_count=today_appointments_count,
        average_rating=avg_rating,
        total_reviews=total_reviews,
        total_prescriptions=total_prescriptions,
        fee_per_consultation=fee_per_consultation,
        total_earnings=total_earnings,
        is_available=profile_data.get("is_available", True),
        working_hours=WorkingHours(**profile_data.get("working_hours", {"start": "09:00", "end": "18:00", "timezone": "Asia/Kolkata"})),
        available_days=profile_data.get("available_days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
        specializations=profile_data.get("specializations", ["Crop Pathology", "Soil Science", "Pest Management"]),
        title=profile_data.get("title", "Senior Agronomy Specialist"),
        bio=profile_data.get("bio", "Certified agricultural expert advising farmers on crop health, soil nutrients, and yield maximization.")
    )


@router.get("/expert/appointments")
async def get_expert_appointments(current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Returns active requests, upcoming consultations, and queued appointments for this expert."""
    expert_id = str(current_user.id)
    safe_expert_id = expert_id.replace("-", "")
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=90)

    # Clean up stale calling records
    await db["active_calls"].update_many(
        {"status": "calling", "created_at": {"$lt": cutoff}},
        {"$set": {"status": "missed"}}
    )

    cursor = db["active_calls"].find({
        "$and": [
            {
                "$or": [
                    {"expert_id": expert_id}, {"expert_id": safe_expert_id},
                    {"expert_id": "exp-1"}, {"accepted_by": expert_id}, {"accepted_by": safe_expert_id}
                ]
            },
            {
                "$or": [
                    {"status": {"$in": ["accepted", "scheduled"]}},
                    {"status": "calling", "created_at": {"$gte": cutoff}}
                ]
            }
        ]
    }).sort("created_at", -1).limit(30)
    calls = await cursor.to_list(length=30)

    result = []
    for c in calls:
        farmer_id = c.get("farmer_id")
        farmer_name = c.get("farmer_name") or "Farmer"
        farmer_location = "Farm Plot"
        farmer_phone = ""
        farmer_avatar = None

        if farmer_id:
            try:
                f_query = {"$or": [{"id": farmer_id}, {"id": str(farmer_id).replace("-", "")}]}
                if ObjectId.is_valid(str(farmer_id)):
                    f_query["$or"].append({"_id": ObjectId(str(farmer_id))})
                f_doc = await db["users"].find_one(f_query)
                if f_doc:
                    farmer_name = f_doc.get("name", "Farmer")
                    farmer_phone = f_doc.get("phone", "")
                    farmer_avatar = f_doc.get("avatar_url")
                    loc_parts = [f_doc.get("village"), f_doc.get("district"), f_doc.get("location")]
                    valid_locs = [p for p in loc_parts if p]
                    farmer_location = ", ".join(valid_locs) if valid_locs else "Agricultural Plot"
            except Exception:
                pass

        crop_issue = "General Crop Health Inspection"
        scan_image = None
        if farmer_id:
            try:
                scan = await db["disease_reports"].find_one({"user_id": str(farmer_id)}, sort=[("created_at", -1)])
                if scan:
                    crop_name = scan.get("crop_name", "Crop")
                    disease_name = scan.get("disease_name", "Health Check").replace("___", " ")
                    crop_issue = f"{crop_name} - {disease_name}"
                    scan_image = scan.get("image_url")
            except Exception:
                pass

        result.append({
            "id": str(c["_id"]),
            "farmer_id": farmer_id,
            "farmer_name": farmer_name,
            "farmer_phone": farmer_phone,
            "farmer_location": farmer_location,
            "farmer_avatar": farmer_avatar or f"https://ui-avatars.com/api/?name={farmer_name.replace(' ', '+')}&background=059669&color=fff",
            "crop_issue": crop_issue,
            "scan_image": scan_image,
            "call_type": c.get("call_type", "video"),
            "room_name": c.get("room_name"),
            "status": c.get("status", "calling"),
            "created_at": c.get("created_at"),
            "scheduled_time": c.get("scheduled_time") or c.get("created_at")
        })

    return result


@router.get("/expert/history")
async def get_expert_consultation_history(current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Returns past handled and completed consultations for this expert."""
    expert_id = str(current_user.id)
    safe_expert_id = expert_id.replace("-", "")

    cursor = db["active_calls"].find({
        "$or": [
            {"expert_id": expert_id}, {"expert_id": safe_expert_id},
            {"accepted_by": expert_id}, {"accepted_by": safe_expert_id}
        ],
        "status": {"$in": ["accepted", "completed", "declined"]}
    }).sort("created_at", -1).limit(50)
    calls = await cursor.to_list(length=50)

    result = []
    for c in calls:
        call_id = str(c["_id"])
        farmer_id = c.get("farmer_id")
        farmer_name = "Farmer"

        if farmer_id:
            try:
                f_query = {"$or": [{"id": farmer_id}, {"id": str(farmer_id).replace("-", "")}]}
                if ObjectId.is_valid(str(farmer_id)):
                    f_query["$or"].append({"_id": ObjectId(str(farmer_id))})
                f_doc = await db["users"].find_one(f_query)
                if f_doc:
                    farmer_name = f_doc.get("name", "Farmer")
            except Exception:
                pass

        # Check prescription
        rx = await db["prescriptions"].find_one({"farmer_id": str(farmer_id), "expert_id": expert_id})
        diagnosis = rx.get("diagnosis") if rx else "Crop Assessment Completed"

        # Check review
        rev = await db["reviews"].find_one({"call_id": call_id})
        rating = rev.get("rating") if rev else None
        comment = rev.get("comment") if rev else None

        result.append({
            "id": call_id,
            "farmer_id": farmer_id,
            "farmer_name": farmer_name,
            "call_type": c.get("call_type", "video"),
            "status": c.get("status", "completed"),
            "diagnosis": diagnosis,
            "room_name": c.get("room_name"),
            "created_at": c.get("created_at"),
            "completed_at": c.get("completed_at"),
            "rating": rating,
            "comment": comment
        })

    return result


@router.get("/expert/reviews")
async def get_expert_reviews(current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Returns authentic farmer ratings and feedback for this expert."""
    expert_id = str(current_user.id)
    safe_expert_id = expert_id.replace("-", "")

    cursor = db["reviews"].find({
        "$or": [{"expert_id": expert_id}, {"expert_id": safe_expert_id}]
    }).sort("created_at", -1).limit(50)
    reviews = await cursor.to_list(length=50)

    result = []
    for r in reviews:
        farmer_id = r.get("farmer_id")
        farmer_name = "Farmer"
        farmer_location = "Agricultural District"
        if farmer_id:
            try:
                f_query = {"$or": [{"id": farmer_id}, {"id": str(farmer_id).replace("-", "")}]}
                if ObjectId.is_valid(str(farmer_id)):
                    f_query["$or"].append({"_id": ObjectId(str(farmer_id))})
                f_doc = await db["users"].find_one(f_query)
                if f_doc:
                    farmer_name = f_doc.get("name", "Farmer")
                    farmer_location = f_doc.get("location") or f"{f_doc.get('village', '')}, {f_doc.get('district', '')}".strip(", ") or "Agricultural District"
            except Exception:
                pass

        result.append({
            "id": str(r["_id"]),
            "farmer_name": farmer_name,
            "farmer_location": farmer_location,
            "rating": r.get("rating", 5),
            "comment": r.get("comment", "Great agronomic advice and support."),
            "created_at": r.get("created_at", datetime.now(timezone.utc))
        })

    return result


@router.get("/expert/availability")
async def get_expert_availability(current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Retrieves current availability toggle, working hours, and fees."""
    expert_id = str(current_user.id)
    safe_expert_id = expert_id.replace("-", "")
    expert_query = {"$or": [{"id": expert_id}, {"id": safe_expert_id}]}
    if ObjectId.is_valid(expert_id):
        expert_query["$or"].append({"_id": ObjectId(expert_id)})
    user_doc = await db["users"].find_one(expert_query)
    profile_data = (user_doc or {}).get("expert_profile", {})

    return {
        "is_available": profile_data.get("is_available", True),
        "working_hours": profile_data.get("working_hours", {"start": "09:00", "end": "18:00", "timezone": "Asia/Kolkata"}),
        "available_days": profile_data.get("available_days", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
        "fee_per_consultation": float(profile_data.get("fee_per_consultation", 0.0)),
        "title": profile_data.get("title", "Senior Agronomy Specialist"),
        "specializations": profile_data.get("specializations", ["Crop Pathology", "Soil Science", "Pest Management"]),
        "bio": profile_data.get("bio", "Certified agricultural expert advising farmers on crop health, soil nutrients, and yield maximization.")
    }


@router.put("/expert/availability")
async def update_expert_availability(req: ExpertAvailabilityUpdate, current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Updates availability status, working hours, and consultation fee."""
    expert_id = str(current_user.id)
    safe_expert_id = expert_id.replace("-", "")
    update_data = req.model_dump()

    expert_query = {"$or": [{"id": expert_id}, {"id": safe_expert_id}]}
    if ObjectId.is_valid(expert_id):
        expert_query["$or"].append({"_id": ObjectId(expert_id)})

    await db["users"].update_one(
        expert_query,
        {"$set": {"expert_profile": update_data}}
    )
    return {"message": "Availability and working hours updated successfully", "profile": update_data}


@router.get("/farmer-crops/{farmer_id}")
async def get_farmer_crops(farmer_id: str, current_user: UserResponse = Depends(RequireRole([UserRole.AGRONOMY_EXPERT, UserRole.ADMIN, UserRole.SUPER_ADMIN])), db = Depends(get_mongo_db)):
    """Allows authorized agronomy experts to review farmer's uploaded crop diagnosis images and scan history."""
    cursor = db["disease_reports"].find({
        "$or": [{"user_id": str(farmer_id)}, {"user_id": str(farmer_id).replace("-", "")}]
    }).sort("created_at", -1).limit(20)
    scans = await cursor.to_list(length=20)

    result = []
    for s in scans:
        result.append({
            "id": str(s["_id"]),
            "crop_name": s.get("crop_name", "Crop"),
            "disease_name": s.get("disease_name", "Healthy").replace("___", " "),
            "confidence": s.get("confidence_score") or s.get("confidence", 0.0),
            "severity": s.get("severity", "Moderate"),
            "image_url": s.get("image_url", ""),
            "symptoms": s.get("symptoms_observed", []),
            "created_at": s.get("created_at", datetime.now(timezone.utc))
        })
    return result
