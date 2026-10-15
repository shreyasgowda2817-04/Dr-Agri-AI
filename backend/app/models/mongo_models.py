import uuid
import enum
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field

def generate_uuid():
    return str(uuid.uuid4())

class UserRole(str, enum.Enum):
    FARMER = "FARMER"
    ADMIN = "ADMIN"
    AGRONOMY_EXPERT = "AGRONOMY_EXPERT"
    DELIVERY_PARTNER = "DELIVERY_PARTNER"
    WAREHOUSE_MANAGER = "WAREHOUSE_MANAGER"
    ADVERTISER = "ADVERTISER"
    NURSERY_MANAGER = "NURSERY_MANAGER"
    SUPER_ADMIN = "SUPER_ADMIN"

class MongoUser(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    name: str
    email: str
    role: UserRole = UserRole.FARMER
    phone: Optional[str] = None
    location: Optional[str] = None
    password_hash: str
    is_onboarded: bool = False
    scan_count: int = 0
    tier: str = "basic"
    district: Optional[str] = None
    village: Optional[str] = None
    preferred_language: str = "en-US"
    avatar_url: Optional[str] = None
    farm_details: Optional[Dict[str, Any]] = None
    notifications: Optional[Dict[str, Any]] = None
    appearance: str = "system"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoOrganization(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    name: str
    org_type: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoOrgMember(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    org_id: str
    user_id: str
    role: str

class MongoExpense(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    user_id: str
    category: str
    amount: float
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    description: Optional[str] = None

class MongoRevenue(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    user_id: str
    source: str
    amount: float
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    description: Optional[str] = None

class MongoFarmPlot(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    user_id: str
    name: str
    area_acres: float
    crop: str
    status: str = "Active"
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    soil_type: Optional[str] = None
    water_source: Optional[str] = None
    irrigation_type: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoCrop(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    farm_id: str
    user_id: str
    crop_name: str
    variety: Optional[str] = None
    planting_date: Optional[datetime] = None
    expected_harvest_date: Optional[datetime] = None
    crop_stage: Optional[str] = None
    area_acres: Optional[float] = None
    notes: Optional[str] = None
    images: Optional[List[str]] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoCoupon(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    code: str
    discount_percentage: float
    is_active: bool = True
    max_uses: Optional[int] = None
    uses_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoOrder(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    user_id: str
    order_ref: str
    items: List[Dict[str, Any]]
    subtotal: float = 0.0
    discount_applied: float = 0.0
    total_amount: float
    payment_method: str = "card"
    status: str = "completed"
    shipping_address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoShipment(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    order_id: str
    status: str = "Pending"
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))



class MongoCropTask(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    crop_id: str
    user_id: str
    task_type: str
    title: str
    description: Optional[str] = None
    scheduled_date: datetime
    is_completed: bool = False
    ai_adjusted: bool = False
    reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoProduct(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    name: str
    category: str
    description: Optional[str] = None
    price: float
    target_diseases: Optional[List[str]] = None
    target_crops: Optional[List[str]] = None
    dosage_per_acre: Optional[str] = None
    is_organic: bool = False
    seller_id: Optional[str] = None
    image_url: Optional[str] = None
    stock_quantity: int = 100
    discount_percentage: float = 0.0
    average_rating: float = 0.0
    review_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoWarehouse(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    name: str
    location: str
    manager_id: Optional[str] = None
    type: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoInventory(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    product_id: str
    warehouse_id: str
    quantity: int = 0
    low_stock_threshold: int = 50
    last_restocked: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoNurseryBatch(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    user_id: str
    seed_type: str
    quantity: int
    growth_stage: str = "Sowing"
    health_status: str = "Pending"
    avg_humidity: int = 70
    avg_temperature: float = 25.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoWarehouseItem(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    user_id: str
    product_name: str
    category: str
    sku: Optional[str] = None
    current_stock: int = 0
    reorder_threshold: int = 10
    price_per_unit: Optional[float] = None
    warehouse_zone: str = "Zone A"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoInventoryLog(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    user_id: str
    item_id: Optional[str] = None
    item_name: str
    action: str
    quantity_change: int = 0
    previous_stock: int = 0
    new_stock: int = 0
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoArticle(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    title: str
    content: str
    article_type: str = "News" # News, Scheme, Guide, Blog
    author_id: str
    is_published: bool = False
    image_url: Optional[str] = None
    tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoTicketMessage(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    sender_id: str
    sender_name: str
    sender_role: str
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MongoTicket(BaseModel):
    id: str = Field(default_factory=generate_uuid)
    user_id: str
    user_name: str
    subject: str
    description: str
    status: str = "OPEN" # OPEN, IN_PROGRESS, RESOLVED
    priority: str = "MEDIUM" # LOW, MEDIUM, HIGH, URGENT
    messages: List[MongoTicketMessage] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
