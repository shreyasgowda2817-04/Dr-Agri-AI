from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from .objectid import PydanticObjectId
from bson import ObjectId

class MarketPrice(BaseModel):
    id: Optional[PydanticObjectId] = Field(default_factory=PydanticObjectId, alias="_id")
    state: str
    district: str
    market: str
    commodity: str
    variety: str
    grade: str
    min_price: float
    max_price: float
    modal_price: float
    unit: str
    date: datetime
    source: str = "Agmarknet"
    fetched_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
