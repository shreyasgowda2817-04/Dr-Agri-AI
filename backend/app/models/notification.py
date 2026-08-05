from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from app.models.objectid import PyObjectId

class NotificationBase(BaseModel):
    user_id: PyObjectId
    message: str
    type: str = Field(..., pattern="^(Alert|Reminder|Weather)$")
    read_status: bool = False

class NotificationInDB(NotificationBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationResponse(NotificationBase):
    id: PyObjectId = Field(alias="_id")
    created_at: datetime
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }
