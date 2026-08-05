from fastapi import APIRouter, Depends
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user
from app.models.user import UserResponse

router = APIRouter()

class UnifiedNotificationResponse(BaseModel):
    id: str
    type: str # CALENDAR, ORDER, SUPPORT, INVENTORY, ALERT
    title: str
    description: Optional[str] = None
    timestamp: datetime
    action_url: Optional[str] = None
    action_id: Optional[str] = None

@router.get("/hub", response_model=List[UnifiedNotificationResponse])
async def get_notification_hub(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Aggregates notifications from across the ecosystem into a single unified stream.
    Checks Calendar Tasks, Low Inventory, Support Tickets, etc.
    """
    notifications = []
    now = datetime.now(timezone.utc)
    
    user_prefs = current_user.notifications or {}
    
    # 1. Calendar Tasks (Due today or overdue)
    if user_prefs.get("in_app_calendar", True):
        # Get all uncompleted tasks
        tasks = await db["crop_tasks"].find({
            "user_id": str(current_user.id),
            "is_completed": False
        }).to_list(100)
        
        for task in tasks:
            # Check if due today or earlier (using naive comparison since both are stored as ISO)
            if task.get("scheduled_date").replace(tzinfo=timezone.utc) <= now:
                notifications.append(UnifiedNotificationResponse(
                    id=f"cal_{task.get('id')}",
                    type="CALENDAR",
                    title=f"{task.get('task_type')} Due",
                    description=task.get('title'),
                    timestamp=task.get("scheduled_date"),
                    action_url="/calendar",
                    action_id=task.get("id")
                ))
            
    # 2. Support Tickets (Updated or Open)
    if user_prefs.get("in_app_support", True):
        tickets = await db["tickets"].find({
            "user_id": str(current_user.id),
            "status": {"$in": ["OPEN", "IN_PROGRESS"]}
        }).to_list(100)
        
        for ticket in tickets:
            notifications.append(UnifiedNotificationResponse(
                id=f"tkt_{ticket.get('id')}",
                type="SUPPORT",
                title=f"Support Ticket: {ticket.get('status')}",
                description=ticket.get('subject'),
                timestamp=ticket.get("updated_at", now),
                action_url="/support",
                action_id=ticket.get("id")
            ))
        
    # 3. Warehouse Inventory (Low Stock) - ONLY FOR ADMINS
    if current_user.role in ["ADMIN", "SUPER_ADMIN"] and user_prefs.get("in_app_inventory", True):
        # Fetch all items across the platform that are low stock
        items = await db["warehouse_items"].find({}).to_list(500)
        
        for item in items:
            if item.get("current_stock", 0) <= item.get("reorder_threshold", 0):
                notifications.append(UnifiedNotificationResponse(
                    id=f"inv_{item.get('id')}",
                    type="INVENTORY",
                    title="System Low Stock Alert",
                    description=f"{item.get('product_name')} is running critically low ({item.get('current_stock')} left).",
                    timestamp=item.get("updated_at", now),
                    action_url="/inventory",
                    action_id=item.get("id")
                ))
            
    # Sort notifications by timestamp descending (newest first)
    notifications.sort(key=lambda x: x.timestamp, reverse=True)
    
    return notifications
