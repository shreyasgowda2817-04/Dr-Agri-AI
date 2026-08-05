from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user
from app.models.user import UserResponse
from app.models.mongo_models import MongoWarehouseItem, MongoInventoryLog

router = APIRouter()

class InventoryItemResponse(BaseModel):
    id: str
    name: str
    category: str
    stock: int
    threshold: int
    zone: str
    status: str
    price_per_unit: float = 0.0

@router.get("/stock", response_model=List[InventoryItemResponse])
async def get_inventory(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Get all warehouse inventory stock for the current user."""
    items = await db["warehouse_items"].find({"user_id": str(current_user.id)}).to_list(1000)
    

    
    response = []
    for item in items:
        status = "Low Stock" if item.get("current_stock") <= item.get("reorder_threshold") else "In Stock"
        response.append({
            "id": item.get("id"),
            "name": item.get("product_name"),
            "category": item.get("category"),
            "stock": item.get("current_stock"),
            "threshold": item.get("reorder_threshold"),
            "zone": item.get("warehouse_zone"),
            "status": status,
            "price_per_unit": item.get("price_per_unit", 0.0)
        })
    return response

class StockAdjustRequest(BaseModel):
    action: str # "add" or "remove"
    quantity: int

@router.post("/adjust/{item_id}")
async def adjust_stock(
    item_id: str,
    req: StockAdjustRequest,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Manually adjust stock quantity."""
    item = await db["warehouse_items"].find_one({"id": item_id, "user_id": str(current_user.id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    update_val = req.quantity if req.action == "add" else -req.quantity
    
    # Do an atomic update
    result = await db["warehouse_items"].find_one_and_update(
        {"id": item_id, "user_id": str(current_user.id)},
        {"$inc": {"current_stock": update_val}},
        return_document=True
    )
    
    if result["current_stock"] < 0:
        result = await db["warehouse_items"].find_one_and_update(
            {"id": item_id, "user_id": str(current_user.id)},
            {"$set": {"current_stock": 0}},
            return_document=True
        )

    # Insert log
    log = MongoInventoryLog(
        user_id=str(current_user.id),
        item_id=item_id,
        item_name=item.get("product_name"),
        action="ADD_STOCK" if req.action == "add" else "REMOVE_STOCK",
        quantity_change=update_val,
        previous_stock=item.get("current_stock"),
        new_stock=result["current_stock"]
    )
    await db["inventory_logs"].insert_one(log.model_dump())

    return {"message": "Stock adjusted successfully", "new_stock": result["current_stock"]}

class NewInventoryItem(BaseModel):
    name: str
    category: str
    zone: str
    initial_stock: int = 0
    threshold: int = 10
    price_per_unit: float = 0.0

@router.post("/item")
async def add_item(
    req: NewInventoryItem,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Add a new item to the warehouse inventory."""
    new_item = MongoWarehouseItem(
        user_id=str(current_user.id),
        product_name=req.name,
        category=req.category,
        warehouse_zone=req.zone,
        current_stock=req.initial_stock,
        reorder_threshold=req.threshold,
        price_per_unit=req.price_per_unit
    )
    item_dict = new_item.model_dump()
    await db["warehouse_items"].insert_one(item_dict)
    
    # Insert log
    log = MongoInventoryLog(
        user_id=str(current_user.id),
        item_id=item_dict["id"],
        item_name=req.name,
        action="CREATE_ITEM",
        quantity_change=req.initial_stock,
        previous_stock=0,
        new_stock=req.initial_stock
    )
    await db["inventory_logs"].insert_one(log.model_dump())
    
    return {"message": "Item added successfully", "id": item_dict["id"]}

@router.delete("/item/{item_id}")
async def delete_item(
    item_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Delete an item from the warehouse inventory."""
    # Fetch item first to get its name for the log
    item = await db["warehouse_items"].find_one({"id": item_id, "user_id": str(current_user.id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    result = await db["warehouse_items"].delete_one({"id": item_id, "user_id": str(current_user.id)})
    
    # Insert log
    log = MongoInventoryLog(
        user_id=str(current_user.id),
        item_id=item_id,
        item_name=item.get("product_name"),
        action="DELETE_ITEM",
        quantity_change=-item.get("current_stock"),
        previous_stock=item.get("current_stock"),
        new_stock=0
    )
    await db["inventory_logs"].insert_one(log.model_dump())
        
    return {"message": "Item deleted successfully"}

@router.get("/logs")
async def get_logs(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Get recent inventory activity logs."""
    logs = await db["inventory_logs"].find(
        {"user_id": str(current_user.id)}
    ).sort("timestamp", -1).limit(50).to_list(50)
    
    # Convert MongoDB _id and serialize datetime
    for log in logs:
        log["_id"] = str(log["_id"])
        
    return logs
