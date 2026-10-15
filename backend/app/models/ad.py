import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

def generate_uuid() -> str:
    return str(uuid.uuid4())

class AdPlacement(str, Enum):
    DASHBOARD = "dashboard"
    MARKETPLACE = "marketplace"
    ALL = "all"

class AdStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    PAUSED = "paused"
    REJECTED = "rejected"
    EXPIRED = "expired"

class MongoAdCampaign(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    advertiser_id: str
    advertiser_name: str
    advertiser_email: Optional[str] = None
    title: str
    description: str
    image_url: str
    destination_url: str
    call_to_action: str = "Learn More"
    placement: str = AdPlacement.ALL.value
    budget_inr: float
    spent_inr: float = 0.0
    cpm_rate: float = 20.0  # Cost per 1000 impressions in INR
    cpc_rate: float = 2.0   # Cost per click in INR
    start_date: datetime
    end_date: datetime
    status: str = AdStatus.PENDING.value
    rejection_reason: Optional[str] = None
    impressions_count: int = 0
    clicks_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoAdEvent(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    ad_id: str
    event_type: str  # "impression" or "click"
    user_id: Optional[str] = None
    client_hash: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=10, max_length=500)
    image_url: str
    destination_url: str
    call_to_action: str = "Learn More"
    placement: str = AdPlacement.ALL.value
    budget_inr: float = Field(..., gt=0)
    start_date: datetime
    end_date: datetime

class AdUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    destination_url: Optional[str] = None
    call_to_action: Optional[str] = None
    placement: Optional[str] = None
    budget_inr: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AdStatusUpdateRequest(BaseModel):
    status: str
    rejection_reason: Optional[str] = None

class AdPublicResponse(BaseModel):
    id: str
    title: str
    description: str
    image_url: str
    destination_url: str
    call_to_action: str
    advertiser_name: str
    placement: str

class AdCampaignResponse(BaseModel):
    id: str
    advertiser_id: str
    advertiser_name: str
    advertiser_email: Optional[str] = None
    title: str
    description: str
    image_url: str
    destination_url: str
    call_to_action: str
    placement: str
    budget_inr: float
    spent_inr: float
    start_date: datetime
    end_date: datetime
    status: str
    rejection_reason: Optional[str] = None
    impressions_count: int
    clicks_count: int
    ctr_percent: float
    created_at: datetime

class AdAnalyticsSummary(BaseModel):
    total_campaigns: int
    pending_count: int
    approved_count: int
    active_count: int
    paused_count: int
    rejected_count: int
    expired_count: int
    total_impressions: int
    total_clicks: int
    average_ctr_percent: float
    total_budget_inr: float
    total_spent_inr: float
