from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import datetime, date, timedelta, timezone
from pydantic import BaseModel, Field, ConfigDict
import os
import httpx

from app.core.database import get_mongo_db
from app.models.mongo_models import MongoCropTask
from app.models.user import UserResponse
from app.api.dependencies import get_current_user

router = APIRouter()

class CropTaskResponse(BaseModel):
    id: str
    crop_id: str
    task_type: str
    title: str
    description: str | None = None
    scheduled_date: datetime
    is_completed: bool
    ai_adjusted: bool
    reason: str | None = None

    model_config = ConfigDict(from_attributes=True)

class PredictResponse(BaseModel):
    message: str
    tasks_shifted: int

@router.get("/tasks", response_model=List[CropTaskResponse])
async def get_tasks(current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Fetch all upcoming calendar tasks for the farmer"""
    tasks_cursor = db["crop_tasks"].find(
        {"user_id": current_user.id, "is_completed": False}
    ).sort("scheduled_date", 1)
    
    tasks = await tasks_cursor.to_list(length=100)
    return tasks

@router.put("/tasks/{task_id}/complete")
async def complete_task(task_id: str, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Mark a specific task as completed"""
    result = await db["crop_tasks"].delete_one({"id": task_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"status": "success"}

@router.post("/predict", response_model=PredictResponse)
async def predict_calendar_shifts(current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """
    Simulates the daily AI Chron Job.
    1. Fetches farmer's plots and crops.
    2. Generates missing baseline tasks.
    3. Checks OpenWeatherMap for the plot's location.
    4. Shifts tasks dynamically (e.g. delays watering if it will rain).
    """
    # 1. Fetch crops & farms
    crops = await db["crops"].find({"user_id": current_user.id}).to_list(length=100)
    
    if not crops:
        return {"message": "No crops found to schedule.", "tasks_shifted": 0}

    # Fetch weather for the first farm (simplification for MVP)
    farm = await db["farm_plots"].find_one({"id": crops[0]["farm_id"]})

    lat = farm.get("latitude") if farm and farm.get("latitude") else 28.6139
    lon = farm.get("longitude") if farm and farm.get("longitude") else 77.2090
    
    weather_desc = "clear sky"
    will_rain = False

    try:
        api_key = os.getenv("OPENWEATHERMAP_API_KEY")
        if api_key:
            async with httpx.AsyncClient() as client:
                res = await client.get(f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={api_key}&units=metric")
                data = res.json()
                if "list" in data and len(data["list"]) > 0:
                    tomorrow_weather = data["list"][8] # approx 24 hours later
                    weather_desc = tomorrow_weather["weather"][0]["description"].lower()
                    if "rain" in weather_desc or "storm" in weather_desc or "drizzle" in weather_desc:
                        will_rain = True
    except Exception as e:
        print(f"Weather API failed: {e}")

    tasks_shifted = 0

    # 2. Generate baseline tasks if none exist
    active_tasks = await db["crop_tasks"].find({"user_id": current_user.id, "is_completed": False}).to_list(length=100)

    now_utc = datetime.now(timezone.utc)

    if not active_tasks:
        new_tasks = []
        for crop in crops:
            # Baseline: Water tomorrow
            t1 = MongoCropTask(
                crop_id=crop["id"], user_id=current_user.id,
                task_type="Water", title=f"Water {crop['crop_name']}",
                scheduled_date=now_utc + timedelta(days=1),
                ai_adjusted=False
            )
            # Baseline: Fertilize in 3 days
            t2 = MongoCropTask(
                crop_id=crop["id"], user_id=current_user.id,
                task_type="Fertilize", title=f"Apply NPK to {crop['crop_name']}",
                scheduled_date=now_utc + timedelta(days=3),
                ai_adjusted=False
            )
            new_tasks.extend([t1.model_dump(), t2.model_dump()])
            
        if new_tasks:
            await db["crop_tasks"].insert_many(new_tasks)
            active_tasks = await db["crop_tasks"].find({"user_id": current_user.id, "is_completed": False}).to_list(length=100)

    # 3. Apply AI Weather Adjustments
    for task in active_tasks:
        if task.get("task_type") == "Water" and will_rain and not task.get("ai_adjusted"):
            new_date = task["scheduled_date"].replace(tzinfo=timezone.utc) + timedelta(days=2)
            await db["crop_tasks"].update_one(
                {"id": task["id"]},
                {"$set": {
                    "scheduled_date": new_date,
                    "ai_adjusted": True,
                    "reason": f"Delayed by 2 days due to '{weather_desc}' forecast."
                }}
            )
            tasks_shifted += 1
        elif task.get("task_type") == "Fertilize" and will_rain and not task.get("ai_adjusted"):
            new_date = task["scheduled_date"].replace(tzinfo=timezone.utc) + timedelta(days=1)
            await db["crop_tasks"].update_one(
                {"id": task["id"]},
                {"$set": {
                    "scheduled_date": new_date,
                    "ai_adjusted": True,
                    "reason": f"Delayed by 1 day to prevent runoff from '{weather_desc}'."
                }}
            )
            tasks_shifted += 1

    return {"message": f"AI Prediction complete. Weather: {weather_desc}.", "tasks_shifted": tasks_shifted}
