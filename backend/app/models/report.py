from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

class DiseaseReportBase(BaseModel):
    user_id: str
    image_url: str
    
    # Backwards compatibility fields for frontend UI expectations
    crop_name: Optional[str] = "Unknown"
    disease_name: Optional[str] = "Unknown"
    confidence_score: Optional[float] = 0.0
    severity: Optional[str] = "Medium"
    recommended_treatment: Optional[Any] = {}
    weather_snapshot: Optional[Any] = None
    chart_data: Optional[Any] = None
    spray_time: Optional[str] = None
    recommended_products: Optional[Any] = []

    # New advanced AI fields (Fully flexible to prevent validation crashes when AI format shifts)
    status: Optional[Any] = None
    crop_detected: Optional[Any] = False
    crop: Optional[Any] = None
    diagnosis: Optional[Any] = None
    symptoms_observed: Optional[Any] = []
    disease_overview: Optional[Any] = None
    treatments: Optional[Any] = None
    chemical_treatment_options: Optional[Any] = []
    sprays: Optional[Any] = None
    ai_recommended_products: Optional[Any] = []
    application_instructions: Optional[Any] = None
    prevention: Optional[Any] = []
    safety_precautions: Optional[Any] = []
    farmer_action_plan: Optional[Any] = None
    warning: Optional[Any] = None
    expert_consultation_required: Optional[Any] = False

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        extra="allow"
    )

class DiseaseReportResponse(DiseaseReportBase):
    id: str = Field(alias="_id")
    created_at: datetime
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        extra="allow"
    )
