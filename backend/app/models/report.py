from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone


class DiseaseReportBase(BaseModel):
    user_id: str
    image_url: str
    
    # Core identifiers & metadata
    report_id: Optional[str] = None
    scan_id: Optional[str] = None
    schema_version: Optional[str] = "v2.5"
    farm_plot_id: Optional[str] = None
    farm_plot_name: Optional[str] = None
    
    # Diagnostic Status: 'expert_confirmed', 'preliminary', 'needs_retake', 'unavailable'
    diagnostic_status: Optional[str] = "preliminary"
    
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

    # Rich Agricultural Intelligence Fields
    status: Optional[Any] = None
    crop_detected: Optional[Any] = True
    crop: Optional[Any] = None
    diagnosis: Optional[Any] = None
    disease_category: Optional[str] = None  # fungal, bacterial, viral, pest, nutrient_deficiency, abiotic_stress, unknown
    affected_area_percentage: Optional[float] = None
    differential_diagnoses: Optional[List[Dict[str, Any]]] = []
    evidence_notes: Optional[str] = None
    uncertainty_warning: Optional[str] = None
    symptoms_observed: Optional[Any] = []
    disease_overview: Optional[Any] = None
    
    # Structured Treatments
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

    # Advanced Recovery & Meteorological Intelligence
    recovery_plan: Optional[Dict[str, Any]] = None  # immediate, next_3_days, next_7_days, follow_up_monitoring
    weather_intelligence: Optional[Dict[str, Any]] = None
    spray_window_analysis: Optional[Dict[str, Any]] = None
    model_info: Optional[Dict[str, Any]] = None  # provider, model_id, report_version
    recovery_timeline: Optional[List[Dict[str, Any]]] = []
    farmer_notes: Optional[List[Dict[str, Any]]] = []
    expert_review: Optional[Dict[str, Any]] = None  # status, reviewer_id, reviewer_name, notes, reviewed_at
    share_token: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        extra="allow"
    )


class DiseaseReportResponse(DiseaseReportBase):
    id: str = Field(alias="_id")
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        extra="allow"
    )
