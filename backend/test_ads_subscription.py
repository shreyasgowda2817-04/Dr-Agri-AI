import asyncio
from datetime import datetime, timedelta, timezone
from app.models.subscription import AVAILABLE_PLANS, SubscriptionPlanId, SubscriptionStatus
from app.services.subscription_service import is_user_premium, get_user_subscription

async def run_tests():
    print("--- 1. Testing Configurable Subscription Plans ---")
    assert AVAILABLE_PLANS["free"]["price"] == 0.0, "Free plan must be ₹0"
    assert AVAILABLE_PLANS["monthly"]["price"] == 99.0, "Monthly plan must be ₹99"
    assert AVAILABLE_PLANS["yearly"]["price"] == 799.0, "Yearly plan must be ₹799"
    print("✓ All pricing tiers configured correctly (Free ₹0, Monthly ₹99, Yearly ₹799)")

    print("\n--- 2. Testing Trusted Server-Side is_user_premium Logic ---")
    now = datetime.now(timezone.utc)
    mock_db = {"users": None} # Not needed when passing full user dict

    # Test A: Standard Free User
    free_user = {"id": "u1", "email": "farmer@agri.ai", "tier": "basic"}
    assert await is_user_premium(mock_db, free_user) is False, "Free user must not be premium"
    print("✓ Free user correctly identified as NOT premium")

    # Test B: Active Premium Monthly User
    future_date = now + timedelta(days=25)
    active_monthly_user = {
        "id": "u2",
        "email": "premium@agri.ai",
        "tier": "pro",
        "subscription": {
            "plan_id": "monthly",
            "status": "active",
            "start_date": now - timedelta(days=5),
            "end_date": future_date
        }
    }
    assert await is_user_premium(mock_db, active_monthly_user) is True, "Active user must be premium"
    print("✓ Active unexpired monthly subscriber correctly identified as premium")

    # Test C: Expired Premium User
    past_date = now - timedelta(days=2)
    expired_user = {
        "id": "u3",
        "email": "expired@agri.ai",
        "tier": "pro",
        "subscription": {
            "plan_id": "monthly",
            "status": "active",
            "start_date": now - timedelta(days=32),
            "end_date": past_date
        }
    }
    assert await is_user_premium(mock_db, expired_user) is False, "Expired subscriber must not be premium"
    print("✓ Expired subscriber correctly identified as NOT premium (ads re-enabled)")

    # Test D: Cancelled User during paid grace period
    cancelled_valid_user = {
        "id": "u4",
        "email": "cancelled@agri.ai",
        "tier": "pro",
        "subscription": {
            "plan_id": "yearly",
            "status": "cancelled",
            "start_date": now - timedelta(days=60),
            "end_date": now + timedelta(days=300)
        }
    }
    assert await is_user_premium(mock_db, cancelled_valid_user) is True, "Cancelled user in paid period must remain premium"
    print("✓ Cancelled user in paid grace period correctly retains premium privileges")

    # Test E: Pending / Unverified Payment User
    pending_user = {
        "id": "u5",
        "email": "pending@agri.ai",
        "tier": "basic",
        "subscription": {
            "plan_id": "monthly",
            "status": "pending",
            "start_date": None,
            "end_date": None
        }
    }
    assert await is_user_premium(mock_db, pending_user) is False, "Pending payment must not grant premium"
    print("✓ Pending/unverified payment correctly denied premium access")

    print("\n--- 3. Testing get_user_subscription Response ---")
    sub_resp = await get_user_subscription(mock_db, active_monthly_user)
    assert sub_resp.is_premium is True
    assert sub_resp.ad_free is True
    assert sub_resp.days_remaining in (24, 25)
    assert "100% Ad-Free Experience (Zero Sponsored Cards)" in sub_resp.features
    print("✓ Subscription status response correctly delivers days remaining and ad-free flag")

    print("\n==========================================")
    print("🎉 ALL SUBSCRIPTION & AD-FREE LOGIC TESTS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
