from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user
from app.models.user import UserResponse

router = APIRouter()

@router.get("/{order_ref}")
async def get_shipment_status(
    order_ref: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Fetches shipping status for an order."""
    order = await db["orders"].find_one({"order_ref": order_ref, "user_id": str(current_user.id)})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    shipment = await db["shipments"].find_one({"order_id": order["id"]})

    if not shipment:
        # Fallback if shipment record was lost
        return {
            "status": "Pending",
            "carrier": "Unknown",
            "tracking_number": None,
            "estimated_delivery": None,
            "updated_at": order.get("created_at").isoformat() if order.get("created_at") else None
        }

    return {
        "status": shipment.get("status"),
        "carrier": shipment.get("carrier"),
        "tracking_number": shipment.get("tracking_number"),
        "estimated_delivery": shipment.get("estimated_delivery").isoformat() if shipment.get("estimated_delivery") else None,
        "updated_at": shipment.get("updated_at").isoformat() if shipment.get("updated_at") else None
    }

@router.get("/track/public/{order_ref}")
async def get_public_tracking(
    order_ref: str,
    db = Depends(get_mongo_db)
):
    """Public provenance tracking. Does not require auth."""
    order = await db["orders"].find_one({"order_ref": order_ref})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    shipment = await db["shipments"].find_one({"order_id": order["id"]})
    
    order_date = order.get("created_at").isoformat() if order.get("created_at") else ""
    ship_date = shipment.get("updated_at").isoformat() if shipment and shipment.get("updated_at") else order_date
    
    current_status = shipment.get("status") if shipment else "Pending"
    carrier = shipment.get("carrier") if shipment and shipment.get("carrier") else "Logistics Partner"

    timeline = [
        {"timestamp": order_date, "title": "Order Placed", "description": "We have received your order.", "icon": "Order", "completed": True}
    ]

    status_sequence = ["Pending", "Packed", "Shipped", "Delivered"]
    current_index = status_sequence.index(current_status) if current_status in status_sequence else 0

    if current_index >= 1:
        timeline.append({"timestamp": ship_date if current_index == 1 else order_date, "title": "Packed", "description": "Order is packed and ready for dispatch.", "icon": "Package", "completed": True})
    else:
        timeline.append({"timestamp": None, "title": "Packed", "description": "Preparing your order.", "icon": "Package", "completed": False})

    if current_index >= 2:
        timeline.append({"timestamp": ship_date if current_index == 2 else order_date, "title": "Shipped", "description": f"Handed over to {carrier}.", "icon": "Truck", "completed": True})
    else:
        timeline.append({"timestamp": None, "title": "Shipped", "description": "Awaiting pickup by carrier.", "icon": "Truck", "completed": False})

    if current_index >= 3:
        timeline.append({"timestamp": ship_date, "title": "Delivered", "description": "Package has been delivered.", "icon": "CheckCircle", "completed": True})
    else:
        timeline.append({"timestamp": None, "title": "Delivered", "description": "Pending delivery.", "icon": "CheckCircle", "completed": False})

    return {
        "order_ref": order.get("order_ref"),
        "items": order.get("items"),
        "total": order.get("total_amount"),
        "timeline": timeline,
        "estimated_delivery": shipment.get("estimated_delivery").isoformat() if shipment and shipment.get("estimated_delivery") else None
    }
