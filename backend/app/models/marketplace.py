from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.objectid import PyObjectId
from bson import ObjectId

class Product(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    category: str = Field(..., description="Seeds, Fertilizer, Equipment, Drone")
    price: float
    seller_name: str
    image_url: Optional[str] = None
    stock: int = 100
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class CropListing(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    farmer_id: Optional[str] = None
    crop_name: str
    quantity_tons: float
    asking_price_per_ton: float
    location: str
    status: str = "Active" # Active, Sold
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class Bid(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    listing_id: str
    buyer_id: Optional[str] = None
    bid_amount_per_ton: float
    message: Optional[str] = None
    status: str = "Pending" # Pending, Accepted, Rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class ProductReview(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    product_id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    rating: int = Field(..., ge=1, le=5)
    comment: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
