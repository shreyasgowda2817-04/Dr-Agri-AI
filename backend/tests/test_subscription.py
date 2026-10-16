import pytest
from datetime import datetime, timedelta, timezone
from app.models.subscription import AVAILABLE_PLANS
from app.services.subscription_service import is_user_premium, get_user_subscription

@pytest.mark.asyncio
async def test_available_plans_pricing():
    assert AVAILABLE_PLANS["free"]["price"] == 0.0
    assert AVAILABLE_PLANS["monthly"]["price"] == 99.0
    assert AVAILABLE_PLANS["yearly"]["price"] == 799.0

@pytest.mark.asyncio
async def test_free_user_not_premium():
    free_user = {"id": "u1", "email": "free@dragri.ai", "tier": "basic"}
    is_prem = await is_user_premium(None, free_user)
    assert is_prem is False

@pytest.mark.asyncio
async def test_active_monthly_subscriber():
    now = datetime.now(timezone.utc)
    active_user = {
        "id": "u2",
        "email": "active@dragri.ai",
        "tier": "pro",
        "subscription": {
            "plan_id": "monthly",
            "status": "active",
            "start_date": now - timedelta(days=5),
            "end_date": now + timedelta(days=25)
        }
    }
    is_prem = await is_user_premium(None, active_user)
    assert is_prem is True

    sub_status = await get_user_subscription(None, active_user)
    assert sub_status.is_premium is True
    assert sub_status.ad_free is True
    assert sub_status.days_remaining in (24, 25)

@pytest.mark.asyncio
async def test_expired_subscriber():
    now = datetime.now(timezone.utc)
    expired_user = {
        "id": "u3",
        "email": "expired@dragri.ai",
        "tier": "pro",
        "subscription": {
            "plan_id": "monthly",
            "status": "active",
            "start_date": now - timedelta(days=35),
            "end_date": now - timedelta(days=5)
        }
    }
    is_prem = await is_user_premium(None, expired_user)
    assert is_prem is False
