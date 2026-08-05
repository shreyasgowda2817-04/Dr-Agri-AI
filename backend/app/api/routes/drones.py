import os
import cloudinary
import cloudinary.uploader
import asyncio
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, WebSocket, WebSocketDisconnect
from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel, Field, ConfigDict

from app.core.database import get_db
from app.models.user import UserResponse
from app.api.dependencies import get_current_user
from app.core.config import settings
from app.services.ml_service import predict_image
import random
import time

if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class DroneScanResponse(BaseModel):
    id: str
    farm_id: str
    image_url: str
    health_score: float
    detected_disease: str | None = None
    severity: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

@router.post("/upload", response_model=DroneScanResponse)
async def upload_drone_scan(
    farm_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Upload a drone scan (or standard field photo), simulate NDVI processing, 
    and save it with a health score.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")

    file_bytes = await file.read()
    
    image_url = ""
    if settings.CLOUDINARY_CLOUD_NAME:
        try:
            upload_result = cloudinary.uploader.upload(file_bytes, folder="drone_scans")
            image_url = upload_result.get("secure_url")
        except Exception as e:
            print(f"Cloudinary upload failed: {e}")
    
    if not image_url:
        import base64
        encoded = base64.b64encode(file_bytes).decode('utf-8')
        image_url = f"data:{file.content_type};base64,{encoded}"
        
    db = get_db()
    
    # Run ML Inference to detect real disease!
    try:
        prediction_result = predict_image(file_bytes)
        detected_disease = prediction_result.get("disease_name", "Unknown")
        severity = prediction_result.get("severity", "unknown")
    except Exception as e:
        print(f"ML Inference Failed: {e}")
        detected_disease = "Analysis Failed"
        severity = "unknown"
        
    # True calculation of health score based entirely on disease severity
    if severity == "high":
        health_score = 35.0
    elif severity == "medium":
        health_score = 65.0
    elif severity == "low":
        health_score = 85.0
    else: # healthy
        health_score = 98.0
        
    scan_data = {
        "user_id": str(current_user.id),
        "farm_id": farm_id,
        "image_url": image_url,
        "health_score": round(health_score, 1),
        "detected_disease": detected_disease,
        "severity": severity,
        "created_at": datetime.now(timezone.utc)
    }
    
    insert_result = await db["drone_scans"].insert_one(scan_data)
    created_scan = await db["drone_scans"].find_one({"_id": insert_result.inserted_id})
    created_scan["id"] = str(created_scan["_id"])
    
    return DroneScanResponse(**created_scan)

@router.get("/timeline/{farm_id}", response_model=List[DroneScanResponse])
async def get_recovery_timeline(farm_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Fetch all drone scans for a specific farm to build the recovery timeline."""
    db = get_db()
    cursor = db["drone_scans"].find({"farm_id": farm_id, "user_id": str(current_user.id)}).sort("created_at", 1)
    scans = await cursor.to_list(length=100)
    
    result = []
    for scan in scans:
        scan["id"] = str(scan["_id"])
        result.append(DroneScanResponse(**scan))
        
    return result

@router.websocket("/stream/{farm_id}")
async def drone_stream(websocket: WebSocket, farm_id: str):
    """
    Real-time WebSocket stream simulating a drone flight sequence over a farm.
    In a real hardware integration, this receives live telemetry from the UAV.
    """
    await websocket.accept()
    try:
        # Step 0: Uplink
        await websocket.send_json({"step": 0, "logs": ["> Initializing Ag-Drone connection..."]})
        await asyncio.sleep(1.2)
        
        # Step 1: Takeoff
        await websocket.send_json({"step": 1, "logs": ["> Satellite uplink established.", "> Requesting takeoff clearance..."]})
        await asyncio.sleep(1.5)
        
        # Step 2: Ascending
        await websocket.send_json({"step": 2, "logs": ["> CLEARANCE GRANTED.", "> Ascending to 120m operational altitude..."]})
        await asyncio.sleep(1.5)
        
        # Step 3: Scanning
        await websocket.send_json({"step": 3, "logs": ["> Altitude reached.", "> Initiating multispectral raster scan pattern..."]})
        await asyncio.sleep(2.0)
        
        # Step 4: Processing
        await websocket.send_json({"step": 4, "logs": ["> Scan complete.", "> Transmitting NDVI telemetry to base station..."]})
        
        # Wait for the frontend to upload the file to /upload and close connection
        while True:
            data = await websocket.receive_text()
            if data == "close":
                break
            
    except WebSocketDisconnect:
        print(f"Drone stream disconnected for farm {farm_id}")
