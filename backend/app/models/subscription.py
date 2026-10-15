import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

def generate_uuid() -> str:
    return str(uuid.uuid4())

class SubscriptionPlanId(str, Enum):
    FREE = "free"
    MONTHLY = "monthly"
    YEARLY = "yearly"

class SubscriptionStatus(str, Enum):
    FREE = "free"
    PENDING = "pending"
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    FAILED = "failed"

# Configurable Pricing & Features (Centralized architecture)
AVAILABLE_PLANS: Dict[str, Dict[str, Any]] = {
    SubscriptionPlanId.FREE.value: {
        "id": SubscriptionPlanId.FREE.value,
        "name": "Free Plan",
        "price": 0.0,
        "billing_period": "Forever",
        "duration_days": 0,
        "currency": "INR",
        "description": "Essential crop health insights with community ad support.",
        "badge": "Current",
        "features": [
            "Core AI Crop Disease Detection",
            "Agricultural Marketplace Access",
            "Farm Plot Weather Updates",
            "Supported by Verified Sponsored Ads"
        ],
        "is_popular": False
    },
    SubscriptionPlanId.MONTHLY.value: {
        "id": SubscriptionPlanId.MONTHLY.value,
        "name": "Premium Monthly",
        "price": 99.0,
        "billing_period": "per month",
        "duration_days": 30,
        "currency": "INR",
        "description": "Complete ad-free productivity for professional farmers.",
        "badge": "Flexible",
        "features": [
            "100% Ad-Free Experience (Zero Sponsored Cards)",
            "Unlimited AI Disease Scans & Treatments",
            "Priority Agronomy Expert Consultations",
            "Downloadable PDF Agri Credit Dossiers",
            "Early Access to Drone Recovery Features"
        ],
        "is_popular": False
    },
    SubscriptionPlanId.YEARLY.value: {
        "id": SubscriptionPlanId.YEARLY.value,
        "name": "Premium Yearly",
        "price": 799.0,
        "billing_period": "per year",
        "duration_days": 365,
        "currency": "INR",
        "description": "Maximum value for uninterrupted year-round farming cycles.",
        "badge": "Best Value (Save 33%)",
        "features": [
            "100% Ad-Free Experience Across All Devices",
            "Save 33% Compared to Monthly Billing (~₹66/month)",
            "Unlimited AI Disease Scans & Chemical Dosage Plans",
            "VIP Queue for Agronomist Video Consultations",
            "Comprehensive Seasonal Yield & Price Trend Forecasts",
            "AgriCredit & Financial Export Dossiers"
        ],
        "is_popular": True
    }
}

class UserSubscriptionData(BaseModel):
    plan_id: str = SubscriptionPlanId.FREE.value
    plan_name: str = "Free Plan"
    status: str = SubscriptionStatus.FREE.value
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    auto_renew: bool = False
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None

class MongoSubscriptionRecord(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    user_id: str
    user_email: str
    plan_id: str
    plan_name: str
    amount: float
    currency: str = "INR"
    status: str = SubscriptionStatus.ACTIVE.value
    start_date: datetime
    end_date: datetime
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreateSubscriptionOrderRequest(BaseModel):
    plan_id: str

class VerifySubscriptionPaymentRequest(BaseModel):
    plan_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class SubscriptionStatusResponse(BaseModel):
    is_premium: bool
    ad_free: bool
    plan_id: str
    plan_name: str
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    days_remaining: Optional[int] = None
    features: List[str] = []
