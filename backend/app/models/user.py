from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timezone
from app.models.mongo_models import UserRole

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    role: UserRole = Field(default=UserRole.FARMER)
    phone: Optional[str] = None
    location: Optional[str] = None
    is_onboarded: bool = False
    district: Optional[str] = None
    village: Optional[str] = None
    preferred_language: str = "en-US"
    avatar_url: Optional[str] = None
    farm_details: Optional[dict] = None
    notifications: Optional[dict] = None
    appearance: str = "system"

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserInDB(UserBase):
    id: Optional[str] = Field(default=None)
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {
        "from_attributes": True
    }

class UserResponse(UserBase):
    id: str
    created_at: datetime
    tier: str = "basic"
    scan_count: int = 0
    
    model_config = {
        "from_attributes": True
    }
