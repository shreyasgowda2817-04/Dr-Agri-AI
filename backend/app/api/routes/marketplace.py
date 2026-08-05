from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.api.dependencies import get_current_user
from app.models.user import UserResponse
from app.models.marketplace import Product, CropListing, Bid, ProductReview
from app.models.mongo_models import MongoOrder, MongoShipment, MongoWarehouseItem
from app.services.notification_service import NotificationService
from app.core.database import get_mongo_db
from datetime import datetime, timezone
from bson import ObjectId
import random
import string
from pydantic import BaseModel

router = APIRouter()

@router.get("/supplies")
async def get_supplies(db = Depends(get_mongo_db)):
    """Returns catalog of farming supplies for purchase from MongoDB."""
    products = await db["products"].find().to_list(100)
    for p in products:
        p.pop("_id", None)
    return products

@router.post("/listings", response_model=CropListing)
async def create_crop_listing(listing: CropListing, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Farmers use this to post their yield predictions to wholesale buyers."""
    listing.farmer_id = str(current_user.id)
    listing_dict = listing.model_dump(by_alias=True, exclude={"id"})
    
    result = await db["listings"].insert_one(listing_dict)
    listing_dict["_id"] = str(result.inserted_id)
    return listing_dict

@router.get("/listings")
async def get_crop_listings(db = Depends(get_mongo_db)):
    """Corporate buyers use this to view available wholesale crops."""
    listings = await db["listings"].find({"status": "Active"}).to_list(100)
    for l in listings:
        l["_id"] = str(l["_id"])
    return listings

@router.post("/bids", response_model=Bid)
async def place_bid(bid: Bid, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Buyers place a bid on a farmer's crop listing."""
    bid.buyer_id = str(current_user.id)
    bid_dict = bid.model_dump(by_alias=True, exclude={"id"})
    
    result = await db["bids"].insert_one(bid_dict)
    bid_dict["_id"] = str(result.inserted_id)
    return bid_dict

@router.get("/listings/{listing_id}/bids")
async def get_listing_bids(listing_id: str, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Farmers view bids on their listings."""
    bids = await db["bids"].find({"listing_id": listing_id}).to_list(100)
    for b in bids:
        b["_id"] = str(b["_id"])
    return bids

@router.post("/bids/{bid_id}/accept")
async def accept_bid(bid_id: str, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Farmers accept a bid."""
    # Find the bid
    bid = await db["bids"].find_one({"_id": ObjectId(bid_id)})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
        
    # Find listing to ensure caller is the farmer
    listing = await db["listings"].find_one({"_id": ObjectId(bid["listing_id"])})
    if listing["farmer_id"] != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to accept this bid")
        
    # Mark bid as Accepted, all others as Rejected
    await db["bids"].update_many({"listing_id": bid["listing_id"]}, {"$set": {"status": "Rejected"}})
    await db["bids"].update_one({"_id": ObjectId(bid_id)}, {"$set": {"status": "Accepted"}})
    
    # Mark listing as Sold
    await db["listings"].update_one({"_id": ObjectId(bid["listing_id"])}, {"$set": {"status": "Sold"}})
    
    return {"message": "Bid accepted! The buyer will be notified to complete the payment."}

@router.get("/products/{product_id}/reviews")
async def get_product_reviews(product_id: str, db = Depends(get_mongo_db)):
    """Fetch reviews for a product."""
    reviews = await db["reviews"].find({"product_id": product_id}).to_list(100)
    for r in reviews:
        r["_id"] = str(r["_id"])
    return reviews

@router.post("/products/{product_id}/reviews", response_model=ProductReview)
async def submit_review(product_id: str, review: ProductReview, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Submit a review and update product average rating."""
    review.product_id = product_id
    review.user_id = str(current_user.id)
    review.user_name = current_user.name
    review_dict = review.model_dump(by_alias=True, exclude={"id"})
    
    result = await db["reviews"].insert_one(review_dict)
    review_dict["_id"] = str(result.inserted_id)
    
    # Update Mongo Product average rating
    pipeline = [
        {"$match": {"product_id": product_id}},
        {"$group": {"_id": "$product_id", "avg_rating": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    aggr = await db["reviews"].aggregate(pipeline).to_list(1)
    if aggr:
        stats = aggr[0]
        await db["products"].update_one(
            {"id": product_id},
            {"$set": {
                "average_rating": stats["avg_rating"],
                "review_count": stats["count"]
            }}
        )
    
    return review_dict

class OrderItem(BaseModel):
    product_id: str
    name: str
    quantity: int
    price: float

class OrderRequest(BaseModel):
    items: List[OrderItem]
    total_amount: float
    shipping_address: str
    lat: float = 19.9975
    lng: float = 73.7898

@router.post("/orders")
async def create_order(order: OrderRequest, current_user: UserResponse = Depends(get_current_user), db = Depends(get_mongo_db)):
    """Creates a new order from checkout cart and routes to logistics."""
    ref_code = "ORD-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    # Pack lat/lng into address string to avoid schema migration
    encoded_address = f"{order.shipping_address}|{order.lat}|{order.lng}"
    
    new_order = MongoOrder(
        user_id=str(current_user.id),
        order_ref=ref_code,
        items=[item.model_dump() for item in order.items],
        subtotal=order.total_amount,
        total_amount=order.total_amount,
        status="completed",
        shipping_address=encoded_address,
        created_at=datetime.now(timezone.utc)
    )
    order_dict = new_order.model_dump()
    await db["orders"].insert_one(order_dict)
    
    # Trigger Email Notification
    email_body = f"Hello {current_user.name},\n\nYour order {ref_code} has been successfully placed!\nTotal: ${order.total_amount}\n\nThank you for shopping with Dr Agri."
    NotificationService.send_email(
        user_email=current_user.email,
        subject=f"Dr Agri Order Confirmation - {ref_code}",
        body=email_body,
        user_prefs=current_user.notifications
    )
    
    new_shipment = MongoShipment(
        order_id=order_dict["id"],
        status="Pending",
        updated_at=datetime.now(timezone.utc)
    )
    await db["shipments"].insert_one(new_shipment.model_dump())
    
    # Auto-add purchased items to user's warehouse inventory
    inventory_items_to_insert = []
    for item in order.items:
        existing_item = await db["warehouse_items"].find_one({"user_id": str(current_user.id), "product_name": item.name})
        if existing_item:
            await db["warehouse_items"].update_one(
                {"id": existing_item["id"]},
                {"$inc": {"current_stock": item.quantity}}
            )
        else:
            inv_item = MongoWarehouseItem(
                user_id=str(current_user.id),
                product_name=item.name,
                category="Marketplace Purchase",
                warehouse_zone="Receiving Dock",
                current_stock=item.quantity,
                reorder_threshold=5,
                price_per_unit=item.price
            )
            inventory_items_to_insert.append(inv_item.model_dump())
            
    if inventory_items_to_insert:
        await db["warehouse_items"].insert_many(inventory_items_to_insert)
    
    return {"message": "Order placed successfully", "order_id": order_dict["id"]}
