import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Any
import uuid
from datetime import datetime, timedelta, timezone

from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user
from app.models.user import UserResponse
from app.models.mongo_models import MongoOrder, MongoShipment, MongoInventoryLog
from app.services.email_service import send_purchase_receipt
from app.core.config import settings

# Initialize Razorpay Client if keys are available
rzp_client = None
if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
    rzp_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

router = APIRouter()

class CartItem(BaseModel):
    id: str
    name: str
    price: float
    quantity: int

class CheckoutRequest(BaseModel):
    items: List[CartItem]
    coupon_code: str | None = None
    payment_method: str = "card" # card, upi, cod
    shipping_address: str | None = None

class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    order_ref: str # The internal DB order reference

@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CheckoutRequest, 
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
) -> Any:
    """
    Creates a checkout session, saves order to DB in pending state, and returns Razorpay order ID.
    """
    try:
        subtotal = sum(item.price * item.quantity for item in request.items)
        discount_applied = 0.0

        # Validate Coupon
        if request.coupon_code:
            coupon = await db["coupons"].find_one({"code": request.coupon_code.upper(), "is_active": True})
            if coupon and (coupon.get("max_uses") is None or coupon.get("uses_count", 0) < coupon.get("max_uses")):
                discount_applied = subtotal * (coupon.get("discount_percentage", 0) / 100)
                await db["coupons"].update_one(
                    {"id": coupon["id"]},
                    {"$inc": {"uses_count": 1}}
                )
                
        # Validate Stock
        for item in request.items:
            product = await db["products"].find_one({"id": item.id})
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item.name} not found.")
            if product.get("stock_quantity", 0) < item.quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {item.name}. Only {product.get('stock_quantity', 0)} left.")
        
        total_amount = subtotal - discount_applied
        items_snapshot = [item.model_dump() for item in request.items]

        order_ref = "ORD-" + str(uuid.uuid4())[:8].upper()

        # Save order to MongoDB (status = pending)
        new_order = MongoOrder(
            user_id=str(current_user.id),
            order_ref=order_ref,
            items=items_snapshot,
            subtotal=round(subtotal, 2),
            discount_applied=round(discount_applied, 2),
            total_amount=round(total_amount, 2),
            payment_method=request.payment_method,
            shipping_address=request.shipping_address or current_user.location,
            status="completed" if request.payment_method == "cod" else "pending",
            created_at=datetime.now(timezone.utc)
        )
        
        order_dict = new_order.model_dump()
        await db["orders"].insert_one(order_dict)
        
        # Create Shipment Tracking
        new_shipment = MongoShipment(
            order_id=new_order.id, 
            status="Pending",
            carrier="AgriLogistics",
            estimated_delivery=datetime.now(timezone.utc) + timedelta(days=3),
            updated_at=datetime.now(timezone.utc)
        )
        await db["shipments"].insert_one(new_shipment.model_dump())

        if request.payment_method == "cod":
            # Deduct stock immediately for COD
            for item in request.items:
                await db["products"].update_one(
                    {"id": item.id},
                    {"$inc": {"stock_quantity": -item.quantity}}
                )
            
            # Fire receipt email for COD immediately
            import asyncio
            asyncio.create_task(send_purchase_receipt(current_user.email, order_ref, total_amount))
            return {
                "order_id": new_order.id,
                "order_ref": order_ref,
                "total": total_amount,
                "message": "Order placed successfully (COD)!",
                "payment_type": "cod"
            }

        # For online payments (card/upi), create Razorpay Order
        if not rzp_client:
            raise HTTPException(status_code=500, detail="Razorpay is not configured on the server.")
            
        rzp_order = rzp_client.order.create({
            "amount": int(total_amount * 100), # Amount in paisa
            "currency": "INR",
            "receipt": order_ref,
            "payment_capture": 1
        })
        
        return {
            "order_id": new_order.id,
            "order_ref": order_ref,
            "total": total_amount,
            "razorpay_order_id": rzp_order['id'],
            "razorpay_key_id": settings.RAZORPAY_KEY_ID,
            "payment_type": "razorpay"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-payment")
async def verify_payment(
    request: VerifyPaymentRequest,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Verifies Razorpay payment signature and completes the order.
    """
    if not rzp_client:
        raise HTTPException(status_code=500, detail="Razorpay is not configured on the server.")
        
    try:
        # Verify Signature
        params_dict = {
            'razorpay_order_id': request.razorpay_order_id,
            'razorpay_payment_id': request.razorpay_payment_id,
            'razorpay_signature': request.razorpay_signature
        }
        rzp_client.utility.verify_payment_signature(params_dict)
        
        # Update order status in DB
        order = await db["orders"].find_one({"order_ref": request.order_ref, "user_id": str(current_user.id)})
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
            
        if order.get("status") == "completed":
            return {"message": "Payment already verified successfully", "order_id": order["id"]}
            
        await db["orders"].update_one(
            {"id": order["id"]},
            {"$set": {"status": "completed"}}
        )
        
        # Deduct stock for paid order and create automated inventory log
        for item in order.get("items", []):
            product = await db["products"].find_one({"id": item.get("id")})
            if product:
                previous_stock = product.get("stock_quantity", 0)
                deduction = item.get("quantity", 1)
                new_stock = previous_stock - deduction

                await db["products"].update_one(
                    {"id": item.get("id")},
                    {"$set": {"stock_quantity": new_stock}}
                )

                # Automated Inventory Logging
                log = MongoInventoryLog(
                    user_id=str(current_user.id),
                    item_id=item.get("id"),
                    item_name=item.get("name") or product.get("name"),
                    action="SALE_DEDUCTION",
                    quantity_change=-deduction,
                    previous_stock=previous_stock,
                    new_stock=new_stock
                )
                await db["inventory_logs"].insert_one(log.model_dump())
            
        # Send receipt
        import asyncio
        asyncio.create_task(send_purchase_receipt(current_user.email, order["order_ref"], order["total_amount"]))
        
        return {"message": "Payment verified successfully", "order_id": order["id"]}
        
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders")
async def get_order_history(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Returns the current user's order history."""
    orders_cursor = db["orders"].find({"user_id": str(current_user.id)}).sort("created_at", -1)
    orders = await orders_cursor.to_list(length=100)
    return [
        {
            "id": o.get("id"),
            "order_ref": o.get("order_ref"),
            "items": o.get("items"),
            "total_amount": o.get("total_amount"),
            "status": o.get("status"),
            "created_at": o.get("created_at").isoformat() if o.get("created_at") else None
        }
        for o in orders
    ]


@router.post("/upgrade-to-pro")
async def upgrade_to_pro(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Creates a Razorpay order for upgrading to Pro.
    """
    if not rzp_client:
        raise HTTPException(status_code=500, detail="Razorpay is not configured on the server.")

    try:
        # Create Razorpay order for Pro upgrade (e.g., Rs. 999)
        rzp_order = rzp_client.order.create({
            "amount": 999 * 100, # Rs. 999 in paisa
            "currency": "INR",
            "receipt": "UPG-" + str(current_user.id)[:8],
            "payment_capture": 1
        })
        
        return {
            "razorpay_order_id": rzp_order['id'],
            "razorpay_key_id": settings.RAZORPAY_KEY_ID,
            "amount": 999,
            "currency": "INR",
            "payment_type": "razorpay"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-upgrade")
async def verify_upgrade(
    request: VerifyPaymentRequest,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Verifies Razorpay payment signature for Pro upgrade and updates user tier.
    """
    if not rzp_client:
        raise HTTPException(status_code=500, detail="Razorpay is not configured on the server.")
        
    try:
        # Verify Signature
        params_dict = {
            'razorpay_order_id': request.razorpay_order_id,
            'razorpay_payment_id': request.razorpay_payment_id,
            'razorpay_signature': request.razorpay_signature
        }
        rzp_client.utility.verify_payment_signature(params_dict)
        
        # Upgrade User
        await db["users"].update_one(
            {"id": str(current_user.id)},
            {"$set": {"tier": "pro", "scan_count": 0}}
        )
        
        # Create an Invoice (Order) for the Subscription
        sub_order = MongoOrder(
            user_id=str(current_user.id),
            order_ref=request.order_ref if hasattr(request, 'order_ref') and request.order_ref else "SUB-" + str(uuid.uuid4())[:8].upper(),
            items=[{"id": "sub_pro", "name": "Pro Tier Subscription", "price": 999.00, "quantity": 1}],
            subtotal=999.00,
            discount_applied=0.0,
            total_amount=999.00,
            payment_method="razorpay",
            status="completed",
            created_at=datetime.now(timezone.utc)
        )
        await db["orders"].insert_one(sub_order.model_dump())
        
        return {"message": "Upgrade successful", "tier": "pro"}
        
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Cancels the user's Pro subscription by reverting them to the Basic tier.
    """
    try:
        await db["users"].update_one(
            {"id": str(current_user.id)},
            {"$set": {"tier": "basic"}}
        )
        return {"message": "Subscription cancelled successfully", "tier": "basic"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request, db = Depends(get_mongo_db)):
    """Secure Razorpay webhook to verify payments in the background without trusting the frontend."""
    webhook_secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", None)
    if not webhook_secret or not rzp_client:
        raise HTTPException(status_code=400, detail="Webhook not configured")

    payload = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    try:
        # Verify the cryptographic signature sent by Razorpay
        rzp_client.utility.verify_webhook_signature(payload.decode("utf-8"), signature, webhook_secret)
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        print(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook verification failed")
    
    # Process the verified webhook payload
    import json
    data = json.loads(payload)
    
    # Example logic:
    # if data['event'] == 'payment.captured':
    #     order_id = data['payload']['payment']['entity']['order_id']
    #     # Look up internal order by razorpay_order_id and mark as PAID
    
    return {"status": "ok"}
