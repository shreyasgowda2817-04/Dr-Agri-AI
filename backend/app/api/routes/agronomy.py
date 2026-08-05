from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.agronomy_service import predict_yield, calculate_irrigation

router = APIRouter()

class SoilTestRequest(BaseModel):
    crop_type: str
    area_acres: float
    n: float
    p: float
    k: float
    ph: float

class IrrigationRequest(BaseModel):
    crop_type: str
    area_acres: float
    soil_type: str = "Loam"
    temperature_celsius: float

@router.post("/soil-test")
async def analyze_soil(request: SoilTestRequest):
    result = predict_yield(
        crop_type=request.crop_type,
        area_acres=request.area_acres,
        n=request.n,
        p=request.p,
        k=request.k,
        ph=request.ph
    )
    return result

@router.post("/irrigation")
async def get_irrigation_schedule(request: IrrigationRequest):
    result = calculate_irrigation(
        crop_type=request.crop_type,
        temp_celsius=request.temperature_celsius,
        soil_type=request.soil_type,
        area_acres=request.area_acres
    )
    return result
