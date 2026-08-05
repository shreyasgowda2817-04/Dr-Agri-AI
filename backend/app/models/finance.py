from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ExpenseItem(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    farm_id: Optional[str] = None
    category: str = Field(..., description="E.g., Seeds, Fertilizer, Labor, Pesticide, Equipment, Other")
    amount: float
    description: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "from_attributes": True
    }

class RevenueItem(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    farm_id: Optional[str] = None
    crop_name: str
    amount: float
    description: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "from_attributes": True
    }

class FarmPlot(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    name: str
    area_size: float = Field(..., description="Area size in acres or hectares")
    crop_type: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "from_attributes": True
    }
