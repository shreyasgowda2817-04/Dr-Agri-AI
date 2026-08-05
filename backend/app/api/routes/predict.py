import os
import cloudinary
import cloudinary.uploader
import httpx
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from typing import Optional
from datetime import datetime, timezone, timedelta
import json

from app.core.database import get_mongo_db
from app.models.user import UserResponse
from app.models.report import DiseaseReportResponse
from app.api.dependencies import get_current_user
from app.services.ml_service import predict_image
from app.core.config import settings

# Configure Cloudinary
if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

router = APIRouter()

FREE_TIER_SCAN_LIMIT = 5

# Local storage directory for uploaded images
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/predict", response_model=DiseaseReportResponse, status_code=status.HTTP_201_CREATED)
async def predict_disease(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Upload a leaf image, run CNN inference, match with products, and save report.
    Enforces scan limits for free-tier users.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    # 0. Enforce scan limit for free-tier users
    user_dict = await db["users"].find_one({"id": current_user.id})

    if user_dict and user_dict.get("tier") == "basic" and user_dict.get("scan_count", 0) >= FREE_TIER_SCAN_LIMIT:
        raise HTTPException(
            status_code=402,
            detail={
                "code": "SCAN_LIMIT_REACHED",
                "message": f"Free plan limit of {FREE_TIER_SCAN_LIMIT} scans reached. Upgrade to Pro to continue.",
                "scans_used": user_dict.get("scan_count", 0),
                "limit": FREE_TIER_SCAN_LIMIT
            }
        )

    # 1. Read File & Upload to Cloud Storage
    file_bytes = await file.read()
    
    image_url = ""
    if settings.CLOUDINARY_CLOUD_NAME:
        try:
            upload_result = cloudinary.uploader.upload(file_bytes, folder="crop_disease_scans")
            image_url = upload_result.get("secure_url")
        except Exception as e:
            print(f"Cloudinary upload failed: {e}")
    
    if not image_url:
        # Fallback to MongoDB Base64
        import base64
        encoded = base64.b64encode(file_bytes).decode('utf-8')
        image_url = f"data:{file.content_type};base64,{encoded}"
        
    # 2. Run Inference
    try:
        prediction_result = predict_image(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Inference Failed: {str(e)}")

    # 2b. Increment scan count
    if user_dict:
        await db["users"].update_one(
            {"id": current_user.id},
            {"$inc": {"scan_count": 1}}
        )

    disease_name = prediction_result["disease_name"]

    # 3. AI Product Matching (Deterministic)
    all_products = await db["products"].find().to_list(length=100)
    
    recommended_products = []
    for p in all_products:
        # Check if the disease is in the product's target_diseases (JSON array)
        targets = p.get("target_diseases") or []
        
        if disease_name in targets or disease_name.split("___")[-1].replace("_", " ") in targets or any(disease_name.lower() in t.lower() or t.lower() in disease_name.lower() for t in targets):
            recommended_products.append({
                "id": p["id"],
                "name": p["name"],
                "price": p["price"],
                "dosage_per_acre": p.get("dosage_per_acre"),
                "image_url": p.get("image_url")
            })


    # 3.5 Generate Dynamic Insights (Weather, Risk Chart, Spray Time)
    weather_snapshot = None
    spray_time = "Tomorrow, 6:00 AM - 8:30 AM"
    if latitude is not None and longitude is not None:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m"
                )
                if resp.status_code == 200:
                    wdata = resp.json()
                    current_w = wdata.get("current", {})
                    temp = current_w.get("temperature_2m")
                    hum = current_w.get("relative_humidity_2m")
                    wind = current_w.get("wind_speed_10m", 0)
                    if temp is not None and hum is not None:
                        weather_snapshot = {
                            "temperature": f"{temp}°C",
                            "humidity": f"{hum}%"
                        }
                        if wind > 15:
                            spray_time = "Delay spray due to high winds"
                        elif temp > 30:
                            spray_time = "Tomorrow, 5:30 AM - 7:30 AM (avoid heat)"
        except Exception as e:
            print(f"Weather fetch failed: {e}")

    # Generate Risk Chart based on severity
    severity_lower = prediction_result.get("severity", "medium").lower()
    start_risk = 85 if severity_lower == "high" else (60 if severity_lower == "medium" else 40)
    chart_data = [
        {"day": "Day 1", "risk": start_risk},
        {"day": "Day 3", "risk": int(start_risk * 0.8)},
        {"day": "Day 7", "risk": int(start_risk * 0.4)},
        {"day": "Day 14", "risk": int(start_risk * 0.1)}
    ]

    # 4. Create Report Document
    report_data = {
        "user_id": str(current_user.id),
        "image_url": image_url,
        "crop_name": disease_name.split("___")[0] if "___" in disease_name else "Unknown",
        "disease_name": disease_name,
        "confidence_score": prediction_result["confidence_score"],
        "severity": prediction_result["severity"],
        "recommended_treatment": prediction_result["treatment"],
        "weather_snapshot": weather_snapshot,
        "chart_data": chart_data,
        "spray_time": spray_time,
        "recommended_products": recommended_products,
        "created_at": datetime.now(timezone.utc)
    }
    
    # 5. Save to MongoDB
    insert_result = await db["disease_reports"].insert_one(report_data)
    
    # 6. Return created report
    created_report = await db["disease_reports"].find_one({"_id": insert_result.inserted_id})
    created_report["_id"] = str(created_report["_id"]) # convert to string for pydantic
    return DiseaseReportResponse(**created_report)
