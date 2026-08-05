from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

class TreatmentRecommendation(BaseModel):
    fertilizers: List[str] = []
    pesticides: List[str] = []
    organic_remedies: List[str] = []
    preventive_measures: List[str] = []

class WeatherSnapshot(BaseModel):
    temperature: float
    humidity: float
    condition: str
    rain_probability: float

class DiseaseReportBase(BaseModel):
    user_id: str
    image_url: str
    crop_name: str
    disease_name: str
    confidence_score: float = Field(..., ge=0.0, le=100.0)
    severity: str = Field(..., pattern="^(Low|Medium|High|Not Applicable)$")
    recommended_treatment: TreatmentRecommendation
    weather_snapshot: Optional[Dict[str, Any]] = None
    chart_data: Optional[List[Dict[str, Any]]] = None
    spray_time: Optional[str] = None
    recommended_products: List[Dict[str, Any]] = []

class DiseaseReportResponse(DiseaseReportBase):
    id: str = Field(alias="_id")
    created_at: datetime
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }
