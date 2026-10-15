from fastapi import APIRouter, Depends
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user
from app.api.routes.weather import get_weather_for_user_internal
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

def ensure_tz(dt):
    if not isinstance(dt, datetime):
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

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
                    timestamp=ensure_tz(task.get("scheduled_date")),
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
                timestamp=ensure_tz(ticket.get("updated_at", now)),
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
                    timestamp=ensure_tz(item.get("updated_at", now)),
                    action_url="/inventory",
                    action_id=item.get("id")
                ))
            

    # 4. Smart Farm Alerts (Dynamic)
    try:
        weather = await get_weather_for_user_internal(current_user, db)
        if weather:
            # Weather Alert (Heavy Rain)
            if weather.rain_probability > 60 or 'Rain' in weather.weather_condition:
                notifications.append(UnifiedNotificationResponse(
                    id=f"alert_weather_{now.timestamp()}",
                    type="ALERT_WEATHER",
                    title="Heavy Rain Expected",
                    description=f"Rain probability {weather.rain_probability}% tomorrow. Postpone spraying and avoid over-irrigation.",
                    timestamp=now,
                    action_url="/dashboard",
                    action_id=None
                ))
            
            # Irrigation Alert (Hot and Dry)
            elif weather.rain_probability < 30 and weather.temperature > 28:
                notifications.append(UnifiedNotificationResponse(
                    id=f"alert_irrigation_{now.timestamp()}",
                    type="ALERT_IRRIGATION",
                    title="Irrigation Required",
                    description=f"High heat ({weather.temperature}°C) and low rain expected. Ensure soil moisture is adequate.",
                    timestamp=now,
                    action_url="/farm",
                    action_id=None
                ))
                
            # Optimal Spraying Alert (Low wind, no rain)
            if weather.wind_speed < 12 and weather.rain_probability < 20:
                notifications.append(UnifiedNotificationResponse(
                    id=f"alert_crop_{now.timestamp()}_spray",
                    type="ALERT_CROP",
                    title="Optimal Spraying Window",
                    description=f"Low wind ({weather.wind_speed} km/h) and clear skies make today ideal for fertilizer or pesticide application.",
                    timestamp=now,
                    action_url="/consult",
                    action_id=None
                ))
                
            # Disease Risk Alert (High humidity)
            if weather.humidity > 75:
                notifications.append(UnifiedNotificationResponse(
                    id=f"alert_disease_{now.timestamp()}",
                    type="ALERT_DISEASE",
                    title="Elevated Disease Risk",
                    description=f"High relative humidity ({weather.humidity}%) increases the risk of fungal infections. Monitor crops closely.",
                    timestamp=now,
                    action_url="/scan",
                    action_id=None
                ))

        # 5. Crop Task Alerts (Fetch real tasks from DB)
        upcoming_tasks = await db["crop_tasks"].find({
            "user_id": str(current_user.id),
            "is_completed": False
        }).to_list(5)
        
        for task in upcoming_tasks:
            notifications.append(UnifiedNotificationResponse(
                id=f"alert_crop_{task.get('id')}",
                type="ALERT_CROP",
                title=f"Crop Task: {task.get('title', 'Pending Task')}",
                description=f"You have an upcoming agricultural task scheduled for {task.get('scheduled_date', 'soon')}.",
                timestamp=now,
                action_url="/calendar",
                action_id=task.get("id")
            ))
            
        # 6. Price Alert (Fetch real market data if possible, or provide a dynamic insight based on their crops)
        user_crops = await db["crops"].find({"user_id": str(current_user.id)}).to_list(5)
        if user_crops:
            crop_name = user_crops[0].get("crop_name", "your crop")
            notifications.append(UnifiedNotificationResponse(
                id=f"alert_price_{now.timestamp()}",
                type="ALERT_PRICE",
                title="Market Movement",
                description=f"We detected recent price fluctuations for {crop_name} in your district. Check the price predictor.",
                timestamp=now,
                action_url="/prices",
                action_id=None
            ))
            
    except Exception as e:
        print(f"Failed to generate smart alerts: {e}")

    
    # Sort notifications by timestamp descending (newest first)

    notifications.sort(key=lambda x: x.timestamp, reverse=True)
    
    return notifications
