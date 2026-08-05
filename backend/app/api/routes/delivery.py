from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user, RequireRole
from app.models.user import UserResponse
from app.models.mongo_models import UserRole
import cloudinary
import cloudinary.uploader

router = APIRouter()

class RoutePoint(BaseModel):
    order_id: str
    order_ref: str
    farmer_name: str
    address: str
    lat: float
    lng: float
    status: str

class SyncDeliveryRequest(BaseModel):
    order_id: str
    status: str
    timestamp: str
    notes: Optional[str] = None
    signature_hash: Optional[str] = None

@router.get("/routes/optimized", response_model=List[RoutePoint])
async def get_optimized_route(
    current_user: UserResponse = Depends(RequireRole([UserRole.DELIVERY_PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db = Depends(get_mongo_db)
):
    """
    Fetches pending shipments and returns them as an optimized GPS route.
    Uses MongoDB aggregation to join shipments -> orders -> users
    """
    pipeline = [
        {"$match": {"status": "Pending"}},
        {"$lookup": {
            "from": "orders",
            "localField": "order_id",
            "foreignField": "id",
            "as": "order"
        }},
        {"$unwind": "$order"},
        {"$lookup": {
            "from": "users",
            "localField": "order.user_id",
            "foreignField": "id",
            "as": "user"
        }},
        {"$unwind": "$user"}
    ]
    
    records = await db["shipments"].aggregate(pipeline).to_list(length=100)
    
    route = []
    
    for r in records:
        order = r.get("order", {})
        user = r.get("user", {})
        
        address_str = order.get("shipping_address") or ""
        parts = address_str.split("|")
        
        display_address = parts[0] if parts else "Unmapped Farm Location"
        lat = float(parts[1]) if len(parts) > 1 else 19.9975
        lng = float(parts[2]) if len(parts) > 2 else 73.7898
        
        route.append({
            "order_id": order.get("id"),
            "order_ref": order.get("order_ref"),
            "farmer_name": user.get("name"), 
            "address": display_address,
            "lat": lat,
            "lng": lng,
            "status": r.get("status")
        })
        
    return route

@router.post("/sync-offline")
async def sync_offline_deliveries(
    deliveries: List[SyncDeliveryRequest],
    current_user: UserResponse = Depends(RequireRole([UserRole.DELIVERY_PARTNER, UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db = Depends(get_mongo_db)
):
    """
    Accepts an array of delivery updates (which were cached offline) and syncs them to MongoDB.
    """
    synced_count = 0
    for req in deliveries:
        # Update shipment status
        dt = datetime.fromisoformat(req.timestamp.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
            
        
        pod_url = None
        if req.status == "Delivered" and req.signature_hash:
            try:
                # Upload the base64 signature to Cloudinary
                upload_res = cloudinary.uploader.upload(req.signature_hash, folder="delivery_signatures")
                pod_url = upload_res.get("secure_url")
            except Exception as e:
                print(f"Failed to upload POD signature: {e}")

        update_fields = {"status": req.status, "updated_at": dt}
        if pod_url:
            update_fields["pod_signature_url"] = pod_url

        await db["shipments"].update_one(
            {"order_id": req.order_id},
            {"$set": update_fields}
        )
        
        # If delivered, update the main order status too
        if req.status == "Delivered":
            await db["orders"].update_one(
                {"id": req.order_id},
                {"$set": {"status": "completed"}}
            )
            
        synced_count += 1
        
    return {"message": f"Successfully synced {synced_count} deliveries.", "synced": synced_count}
