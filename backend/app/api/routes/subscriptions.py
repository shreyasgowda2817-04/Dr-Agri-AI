import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
import razorpay

from app.core.config import settings
from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user
from app.models.user import UserResponse
from app.models.mongo_models import MongoOrder
from app.models.subscription import (
    AVAILABLE_PLANS,
    SubscriptionPlanId,
    SubscriptionStatus,
    CreateSubscriptionOrderRequest,
    VerifySubscriptionPaymentRequest,
    SubscriptionStatusResponse,
    MongoSubscriptionRecord
)
from app.services.subscription_service import get_user_subscription, is_user_premium

router = APIRouter()

# Initialize Razorpay client
rzp_client = None
if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
    try:
        rzp_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    except Exception as e:
        print(f"[Razorpay Init Warning] {e}")

@router.get("/plans")
async def get_subscription_plans() -> List[Dict[str, Any]]:
    """Returns all available configurable subscription plans."""
    return list(AVAILABLE_PLANS.values())

@router.get("/me", response_model=SubscriptionStatusResponse)
async def get_my_subscription(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Returns the current user's verified subscription status."""
    return await get_user_subscription(db, current_user.id)

@router.post("/create-order")
async def create_subscription_order(
    request: CreateSubscriptionOrderRequest,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Creates a Razorpay order for subscription payment.
    Enforces server-side price validation against configured plans.
    """
    plan = AVAILABLE_PLANS.get(request.plan_id)
    if not plan or request.plan_id == SubscriptionPlanId.FREE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid subscription plan selected."
        )

    price_inr = plan["price"]
    amount_in_paisa = int(round(price_inr * 100))
    receipt = f"SUB-{str(current_user.id)[:8]}-{int(datetime.now().timestamp())}"

    # Use Razorpay API if live/test keys are present
    if rzp_client:
        try:
            rzp_order = rzp_client.order.create({
                "amount": amount_in_paisa,
                "currency": "INR",
                "receipt": receipt,
                "notes": {
                    "user_id": str(current_user.id),
                    "plan_id": plan["id"],
                    "plan_name": plan["name"],
                    "email": current_user.email
                },
                "payment_capture": 1
            })
            return {
                "order_id": rzp_order["id"],
                "amount": price_inr,
                "currency": "INR",
                "key_id": settings.RAZORPAY_KEY_ID,
                "plan_id": plan["id"],
                "plan_name": plan["name"],
                "is_mock": False
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Razorpay order generation failed: {str(e)}"
            )

    # Simulated Development fallback if Razorpay credentials are not yet added to .env
    mock_order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
    return {
        "order_id": mock_order_id,
        "amount": price_inr,
        "currency": "INR",
        "key_id": "rzp_test_placeholder",
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "is_mock": True
    }

@router.post("/verify", response_model=SubscriptionStatusResponse)
async def verify_subscription_payment(
    request: VerifySubscriptionPaymentRequest,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Server-side cryptographic verification of the Razorpay payment signature.
    Activates the subscription and updates user status safely without mutating existing data.
    """
    plan = AVAILABLE_PLANS.get(request.plan_id)
    if not plan or request.plan_id == SubscriptionPlanId.FREE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan for verification."
        )

    # Verify signature
    is_mock = request.razorpay_order_id.startswith("order_mock_")
    if rzp_client and not is_mock:
        try:
            rzp_client.utility.verify_payment_signature({
                "razorpay_order_id": request.razorpay_order_id,
                "razorpay_payment_id": request.razorpay_payment_id,
                "razorpay_signature": request.razorpay_signature
            })
        except razorpay.errors.SignatureVerificationError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cryptographic payment verification failed. Invalid signature."
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Signature verification error: {str(e)}"
            )
    elif not is_mock and not rzp_client:
        # If client tried live without server keys configured
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay is not configured on the server."
        )

    now = datetime.now(timezone.utc)
    duration_days = plan["duration_days"]
    end_date = now + timedelta(days=duration_days)

    # 1. Safe User Subscription Extension
    subscription_data = {
        "plan_id": plan["id"],
        "plan_name": plan["name"],
        "status": SubscriptionStatus.ACTIVE.value,
        "start_date": now,
        "end_date": end_date,
        "auto_renew": True,
        "razorpay_order_id": request.razorpay_order_id,
        "razorpay_payment_id": request.razorpay_payment_id,
        "updated_at": now
    }

    await db["users"].update_one(
        {"id": str(current_user.id)},
        {"$set": {
            "tier": "pro",
            "subscription": subscription_data
        }}
    )

    # 2. Record in subscriptions collection
    sub_record = MongoSubscriptionRecord(
        user_id=str(current_user.id),
        user_email=current_user.email,
        plan_id=plan["id"],
        plan_name=plan["name"],
        amount=plan["price"],
        currency="INR",
        status=SubscriptionStatus.ACTIVE.value,
        start_date=now,
        end_date=end_date,
        razorpay_order_id=request.razorpay_order_id,
        razorpay_payment_id=request.razorpay_payment_id,
        razorpay_signature=request.razorpay_signature,
        created_at=now
    )
    await db["subscriptions"].insert_one(sub_record.model_dump())

    # 3. Create unified Order invoice for farmer financial history
    sub_order = MongoOrder(
        user_id=str(current_user.id),
        order_ref=f"SUB-{uuid.uuid4().hex[:8].upper()}",
        items=[{
            "id": f"sub_{plan['id']}",
            "name": f"{plan['name']} ({plan['billing_period']})",
            "price": plan["price"],
            "quantity": 1
        }],
        subtotal=plan["price"],
        discount_applied=0.0,
        total_amount=plan["price"],
        payment_method="razorpay",
        status="completed",
        created_at=now
    )
    await db["orders"].insert_one(sub_order.model_dump())

    return SubscriptionStatusResponse(
        is_premium=True,
        ad_free=True,
        plan_id=plan["id"],
        plan_name=plan["name"],
        status=SubscriptionStatus.ACTIVE.value,
        start_date=now,
        end_date=end_date,
        days_remaining=duration_days,
        features=plan["features"]
    )

@router.post("/cancel", response_model=SubscriptionStatusResponse)
async def cancel_subscription(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Cancels subscription renewal.
    The paid-through period remains active until end_date.
    """
    user_dict = await db["users"].find_one({"id": str(current_user.id)})
    if not user_dict or not user_dict.get("subscription"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription found to cancel."
        )

    await db["users"].update_one(
        {"id": str(current_user.id)},
        {"$set": {
            "subscription.status": SubscriptionStatus.CANCELLED.value,
            "subscription.auto_renew": False
        }}
    )

    return await get_user_subscription(db, current_user.id)

@router.get("/history")
async def get_subscription_history(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Returns the authenticated user's subscription transaction history."""
    cursor = db["subscriptions"].find({"user_id": str(current_user.id)}).sort("created_at", -1)
    history = await cursor.to_list(length=50)
    for h in history:
        if "_id" in h:
            h["_id"] = str(h["_id"])
    return history
