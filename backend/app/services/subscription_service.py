from datetime import datetime, timezone
from typing import Optional, Dict, Any, Union
from app.models.subscription import (
    AVAILABLE_PLANS,
    SubscriptionPlanId,
    SubscriptionStatus,
    SubscriptionStatusResponse
)

def _parse_datetime(dt_val: Any) -> Optional[datetime]:
    if not dt_val:
        return None
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=timezone.utc)
        return dt_val
    if isinstance(dt_val, str):
        try:
            parsed = datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed
        except Exception:
            return None
    return None

async def resolve_user_dict(db, user_or_id: Union[str, dict, Any]) -> Optional[Dict[str, Any]]:
    """Resolves a user identifier or object into a raw user dict from MongoDB."""
    if isinstance(user_or_id, dict):
        return user_or_id
    if hasattr(user_or_id, "id"):
        user_id = str(user_or_id.id)
    elif isinstance(user_or_id, str):
        user_id = user_or_id
    else:
        return None

    user = await db["users"].find_one({"id": user_id})
    if not user:
        try:
            from bson import ObjectId
            user = await db["users"].find_one({"_id": ObjectId(user_id)})
        except Exception:
            pass
    return user

async def is_user_premium(db, user_or_id: Union[str, dict, Any]) -> bool:
    """
    Trusted server-side subscription validation.
    Returns True ONLY if user possesses a verified, unexpired premium plan.
    Never relies on client-provided flags or unverified states.
    """
    user_dict = await resolve_user_dict(db, user_or_id)
    if not user_dict:
        return False

    now = datetime.now(timezone.utc)
    sub = user_dict.get("subscription")

    if isinstance(sub, dict):
        status = str(sub.get("status", "")).lower()
        plan_id = str(sub.get("plan_id", "")).lower()

        # Only active or cancelled (paid-through grace period) are eligible
        if status in [SubscriptionStatus.ACTIVE.value, SubscriptionStatus.CANCELLED.value]:
            end_date = _parse_datetime(sub.get("end_date"))
            if end_date:
                return end_date > now
            # If no end date set but plan is monthly/yearly active, consider active
            if plan_id in [SubscriptionPlanId.MONTHLY.value, SubscriptionPlanId.YEARLY.value]:
                return True

    # Backward compatibility with legacy tier="pro" if subscription subdocument was not present
    tier = str(user_dict.get("tier", "")).lower()
    if tier == "pro":
        if sub and isinstance(sub, dict):
            end_date = _parse_datetime(sub.get("end_date"))
            if end_date and end_date <= now:
                return False
        return True

    return False

async def get_user_subscription(db, user_or_id: Union[str, dict, Any]) -> SubscriptionStatusResponse:
    """
    Returns trusted comprehensive subscription details for the authenticated user.
    """
    user_dict = await resolve_user_dict(db, user_or_id)
    now = datetime.now(timezone.utc)

    if not user_dict:
        free_plan = AVAILABLE_PLANS[SubscriptionPlanId.FREE.value]
        return SubscriptionStatusResponse(
            is_premium=False,
            ad_free=False,
            plan_id=free_plan["id"],
            plan_name=free_plan["name"],
            status=SubscriptionStatus.FREE.value,
            features=free_plan["features"]
        )

    sub = user_dict.get("subscription")
    tier = str(user_dict.get("tier", "")).lower()

    if isinstance(sub, dict):
        plan_id = sub.get("plan_id", SubscriptionPlanId.FREE.value)
        status = sub.get("status", SubscriptionStatus.FREE.value)
        start_date = _parse_datetime(sub.get("start_date"))
        end_date = _parse_datetime(sub.get("end_date"))

        # Check for expiry
        if end_date and end_date <= now:
            # Plan has expired
            status = SubscriptionStatus.EXPIRED.value
            is_premium = False
            days_remaining = 0
            # Background update user status safely without mutating existing orders
            if sub.get("status") != SubscriptionStatus.EXPIRED.value:
                try:
                    await db["users"].update_one(
                        {"id": user_dict.get("id", str(user_dict.get("_id")))},
                        {"$set": {"subscription.status": SubscriptionStatus.EXPIRED.value, "tier": "basic"}}
                    )
                except Exception:
                    pass
        elif status in [SubscriptionStatus.ACTIVE.value, SubscriptionStatus.CANCELLED.value] and plan_id in [SubscriptionPlanId.MONTHLY.value, SubscriptionPlanId.YEARLY.value]:
            is_premium = True
            days_remaining = max(0, (end_date - now).days) if end_date else 30
        else:
            is_premium = False
            days_remaining = 0

        plan_info = AVAILABLE_PLANS.get(plan_id, AVAILABLE_PLANS[SubscriptionPlanId.FREE.value])
        return SubscriptionStatusResponse(
            is_premium=is_premium,
            ad_free=is_premium,
            plan_id=plan_id,
            plan_name=plan_info.get("name", "Custom Plan"),
            status=status,
            start_date=start_date,
            end_date=end_date,
            days_remaining=days_remaining,
            features=plan_info.get("features", [])
        )

    # Legacy tier check
    if tier == "pro":
        pro_plan = AVAILABLE_PLANS[SubscriptionPlanId.MONTHLY.value]
        return SubscriptionStatusResponse(
            is_premium=True,
            ad_free=True,
            plan_id=pro_plan["id"],
            plan_name=pro_plan["name"],
            status=SubscriptionStatus.ACTIVE.value,
            days_remaining=30,
            features=pro_plan["features"]
        )

    free_plan = AVAILABLE_PLANS[SubscriptionPlanId.FREE.value]
    return SubscriptionStatusResponse(
        is_premium=False,
        ad_free=False,
        plan_id=free_plan["id"],
        plan_name=free_plan["name"],
        status=SubscriptionStatus.FREE.value,
        features=free_plan["features"]
    )
