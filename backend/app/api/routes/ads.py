import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query

from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user, get_optional_current_user, get_current_admin, RequireRole
from app.models.mongo_models import UserRole
from app.models.user import UserResponse
from app.models.ad import (
    AdPlacement,
    AdStatus,
    MongoAdCampaign,
    MongoAdEvent,
    AdCreateRequest,
    AdUpdateRequest,
    AdStatusUpdateRequest,
    AdPublicResponse,
    AdCampaignResponse,
    AdAnalyticsSummary
)
from app.services.subscription_service import is_user_premium

router = APIRouter()

def _get_client_hash(request: Request, user_id: Optional[str] = None) -> str:
    ip = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("user-agent", "")
    raw = f"{ip}:{ua}:{user_id or ''}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def _format_campaign_response(ad: Dict[str, Any]) -> AdCampaignResponse:
    impressions = ad.get("impressions_count", 0)
    clicks = ad.get("clicks_count", 0)
    ctr = round((clicks / impressions * 100), 2) if impressions > 0 else 0.0
    return AdCampaignResponse(
        id=ad["id"],
        advertiser_id=ad["advertiser_id"],
        advertiser_name=ad.get("advertiser_name", "Advertiser"),
        advertiser_email=ad.get("advertiser_email"),
        title=ad["title"],
        description=ad["description"],
        image_url=ad["image_url"],
        destination_url=ad["destination_url"],
        call_to_action=ad.get("call_to_action", "Learn More"),
        placement=ad.get("placement", AdPlacement.ALL.value),
        budget_inr=ad.get("budget_inr", 0.0),
        spent_inr=round(ad.get("spent_inr", 0.0), 2),
        start_date=ad["start_date"],
        end_date=ad["end_date"],
        status=ad.get("status", AdStatus.PENDING.value),
        rejection_reason=ad.get("rejection_reason"),
        impressions_count=impressions,
        clicks_count=clicks,
        ctr_percent=ctr,
        created_at=ad.get("created_at", datetime.now(timezone.utc))
    )

# ─── Public Farmer-Facing Ad Delivery ───────────────────────────────────────

@router.get("/public", response_model=List[AdPublicResponse])
async def get_eligible_ads(
    placement: Optional[str] = Query("all", description="Placement filter: dashboard, marketplace, all"),
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    db = Depends(get_mongo_db)
):
    """
    Returns verified active advertisements for farmers.
    ENFORCES PREMIUM AD-FREE GUARANTEE: If caller has an active premium subscription,
    returns empty list immediately. No ads served, zero bandwidth, zero impressions.
    """
    if current_user:
        premium_active = await is_user_premium(db, current_user.id)
        if premium_active:
            return []

    now = datetime.now(timezone.utc)
    query: Dict[str, Any] = {
        "status": {"$in": [AdStatus.APPROVED.value, AdStatus.ACTIVE.value]},
        "start_date": {"$lte": now},
        "end_date": {"$gte": now},
        "$expr": {"$lt": ["$spent_inr", "$budget_inr"]}
    }

    if placement and placement != "all":
        query["placement"] = {"$in": [placement, "all"]}

    cursor = db["ads"].find(query).limit(10)
    ads = await cursor.to_list(length=10)

    results = []
    for ad in ads:
        results.append(AdPublicResponse(
            id=ad["id"],
            title=ad["title"],
            description=ad["description"],
            image_url=ad["image_url"],
            destination_url=ad["destination_url"],
            call_to_action=ad.get("call_to_action", "Learn More"),
            advertiser_name=ad.get("advertiser_name", "Sponsored Partner"),
            placement=ad.get("placement", "all")
        ))
    return results

# ─── Analytics & Event Tracking (Anti-Fraud & Debounced) ─────────────────────

@router.post("/{ad_id}/impression")
async def track_ad_impression(
    ad_id: str,
    request: Request,
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    db = Depends(get_mongo_db)
):
    """
    Records an ad impression with debounce anti-fraud protection.
    Premium users never trigger billable impressions.
    """
    if current_user and await is_user_premium(db, current_user.id):
        return {"status": "ignored_premium"}

    client_hash = _get_client_hash(request, str(current_user.id) if current_user else None)
    now = datetime.now(timezone.utc)

    # Debounce: check if same client triggered impression within 15 seconds
    cutoff = now - timedelta(seconds=15)
    existing = await db["ad_events"].find_one({
        "ad_id": ad_id,
        "event_type": "impression",
        "client_hash": client_hash,
        "timestamp": {"$gte": cutoff}
    })
    if existing:
        return {"status": "debounced"}

    ad = await db["ads"].find_one({"id": ad_id})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad campaign not found")

    cpm_rate = ad.get("cpm_rate", 20.0)
    cost_per_impression = cpm_rate / 1000.0
    new_spent = round(ad.get("spent_inr", 0.0) + cost_per_impression, 4)
    new_status = ad.get("status")

    if new_spent >= ad.get("budget_inr", 0.0):
        new_status = AdStatus.EXPIRED.value

    await db["ads"].update_one(
        {"id": ad_id},
        {
            "$inc": {"impressions_count": 1},
            "$set": {"spent_inr": new_spent, "status": new_status, "updated_at": now}
        }
    )

    event = MongoAdEvent(
        ad_id=ad_id,
        event_type="impression",
        user_id=str(current_user.id) if current_user else None,
        client_hash=client_hash,
        timestamp=now
    )
    await db["ad_events"].insert_one(event.model_dump())

    return {"status": "recorded"}

@router.post("/{ad_id}/click")
async def track_ad_click(
    ad_id: str,
    request: Request,
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    db = Depends(get_mongo_db)
):
    """
    Records an ad click and applies CPC rate to budget spend.
    Premium users never trigger billable clicks.
    """
    if current_user and await is_user_premium(db, current_user.id):
        return {"status": "ignored_premium"}

    client_hash = _get_client_hash(request, str(current_user.id) if current_user else None)
    now = datetime.now(timezone.utc)

    # Debounce duplicate rapid clicks
    cutoff = now - timedelta(seconds=10)
    existing = await db["ad_events"].find_one({
        "ad_id": ad_id,
        "event_type": "click",
        "client_hash": client_hash,
        "timestamp": {"$gte": cutoff}
    })
    if existing:
        return {"status": "debounced"}

    ad = await db["ads"].find_one({"id": ad_id})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad campaign not found")

    cpc_rate = ad.get("cpc_rate", 2.0)
    new_spent = round(ad.get("spent_inr", 0.0) + cpc_rate, 2)
    new_status = ad.get("status")

    if new_spent >= ad.get("budget_inr", 0.0):
        new_status = AdStatus.EXPIRED.value

    await db["ads"].update_one(
        {"id": ad_id},
        {
            "$inc": {"clicks_count": 1},
            "$set": {"spent_inr": new_spent, "status": new_status, "updated_at": now}
        }
    )

    event = MongoAdEvent(
        ad_id=ad_id,
        event_type="click",
        user_id=str(current_user.id) if current_user else None,
        client_hash=client_hash,
        timestamp=now
    )
    await db["ad_events"].insert_one(event.model_dump())

    return {
        "status": "recorded",
        "destination_url": ad.get("destination_url")
    }

# ─── Advertiser Portal Endpoints ───────────────────────────────────────────

get_current_advertiser = RequireRole([UserRole.ADVERTISER, UserRole.ADMIN, UserRole.SUPER_ADMIN])

@router.get("/my-campaigns", response_model=List[AdCampaignResponse])
async def get_my_campaigns(
    current_user: UserResponse = Depends(get_current_advertiser),
    db = Depends(get_mongo_db)
):
    """Returns campaigns owned by the authenticated advertiser."""
    cursor = db["ads"].find({"advertiser_id": str(current_user.id)}).sort("created_at", -1)
    campaigns = await cursor.to_list(length=100)
    return [_format_campaign_response(c) for c in campaigns]

@router.post("/campaigns", response_model=AdCampaignResponse)
async def create_ad_campaign(
    campaign_in: AdCreateRequest,
    current_user: UserResponse = Depends(get_current_advertiser),
    db = Depends(get_mongo_db)
):
    """
    Submits a new advertisement campaign.
    Campaigns remain in 'pending' status until verified and approved by an administrator.
    """
    if campaign_in.end_date <= campaign_in.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign end date must be after start date."
        )

    if campaign_in.budget_inr < 50.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum campaign budget is ₹50 INR."
        )

    new_campaign = MongoAdCampaign(
        advertiser_id=str(current_user.id),
        advertiser_name=current_user.name,
        advertiser_email=current_user.email,
        title=campaign_in.title,
        description=campaign_in.description,
        image_url=campaign_in.image_url,
        destination_url=campaign_in.destination_url,
        call_to_action=campaign_in.call_to_action,
        placement=campaign_in.placement,
        budget_inr=campaign_in.budget_inr,
        start_date=campaign_in.start_date,
        end_date=campaign_in.end_date,
        status=AdStatus.PENDING.value
    )

    doc = new_campaign.model_dump()
    await db["ads"].insert_one(doc)
    return _format_campaign_response(doc)

@router.patch("/campaigns/{ad_id}/pause")
async def pause_my_campaign(
    ad_id: str,
    current_user: UserResponse = Depends(get_current_advertiser),
    db = Depends(get_mongo_db)
):
    """Allows advertiser to pause their active campaign."""
    campaign = await db["ads"].find_one({"id": ad_id, "advertiser_id": str(current_user.id)})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    await db["ads"].update_one(
        {"id": ad_id},
        {"$set": {"status": AdStatus.PAUSED.value, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Campaign paused successfully", "status": AdStatus.PAUSED.value}

@router.patch("/campaigns/{ad_id}/resume")
async def resume_my_campaign(
    ad_id: str,
    current_user: UserResponse = Depends(get_current_advertiser),
    db = Depends(get_mongo_db)
):
    """Allows advertiser to resume a paused campaign."""
    campaign = await db["ads"].find_one({"id": ad_id, "advertiser_id": str(current_user.id)})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    await db["ads"].update_one(
        {"id": ad_id},
        {"$set": {"status": AdStatus.ACTIVE.value, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Campaign resumed successfully", "status": AdStatus.ACTIVE.value}

@router.delete("/campaigns/{ad_id}")
async def delete_my_campaign(
    ad_id: str,
    current_user: UserResponse = Depends(get_current_advertiser),
    db = Depends(get_mongo_db)
):
    """Allows advertiser to remove a pending or draft campaign."""
    campaign = await db["ads"].find_one({"id": ad_id, "advertiser_id": str(current_user.id)})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    await db["ads"].delete_one({"id": ad_id})
    return {"message": "Campaign deleted successfully"}

# ─── Admin Moderation & Platform Analytics ───────────────────────────────────

@router.get("/admin/all", response_model=List[AdCampaignResponse])
async def admin_get_all_campaigns(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    admin_user: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Admin endpoint to inspect all platform advertising campaigns."""
    query: Dict[str, Any] = {}
    if status_filter and status_filter != "all":
        query["status"] = status_filter
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"advertiser_name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]

    cursor = db["ads"].find(query).sort("created_at", -1)
    campaigns = await cursor.to_list(length=200)
    return [_format_campaign_response(c) for c in campaigns]

@router.get("/admin/analytics", response_model=AdAnalyticsSummary)
async def admin_get_ad_analytics(
    admin_user: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """Platform-wide advertising analytics summary for Dr Agri AI."""
    cursor = db["ads"].find({})
    campaigns = await cursor.to_list(length=500)

    total_campaigns = len(campaigns)
    pending_count = sum(1 for c in campaigns if c.get("status") == AdStatus.PENDING.value)
    approved_count = sum(1 for c in campaigns if c.get("status") == AdStatus.APPROVED.value)
    active_count = sum(1 for c in campaigns if c.get("status") == AdStatus.ACTIVE.value)
    paused_count = sum(1 for c in campaigns if c.get("status") == AdStatus.PAUSED.value)
    rejected_count = sum(1 for c in campaigns if c.get("status") == AdStatus.REJECTED.value)
    expired_count = sum(1 for c in campaigns if c.get("status") == AdStatus.EXPIRED.value)

    total_impressions = sum(c.get("impressions_count", 0) for c in campaigns)
    total_clicks = sum(c.get("clicks_count", 0) for c in campaigns)
    total_budget = sum(c.get("budget_inr", 0.0) for c in campaigns)
    total_spent = sum(c.get("spent_inr", 0.0) for c in campaigns)

    avg_ctr = round((total_clicks / total_impressions * 100), 2) if total_impressions > 0 else 0.0

    return AdAnalyticsSummary(
        total_campaigns=total_campaigns,
        pending_count=pending_count,
        approved_count=approved_count,
        active_count=active_count,
        paused_count=paused_count,
        rejected_count=rejected_count,
        expired_count=expired_count,
        total_impressions=total_impressions,
        total_clicks=total_clicks,
        average_ctr_percent=avg_ctr,
        total_budget_inr=round(total_budget, 2),
        total_spent_inr=round(total_spent, 2)
    )

@router.patch("/admin/{ad_id}/status")
async def admin_update_ad_status(
    ad_id: str,
    update: AdStatusUpdateRequest,
    admin_user: UserResponse = Depends(get_current_admin),
    db = Depends(get_mongo_db)
):
    """
    Admin control to Approve (set active), Reject (with feedback), Pause, or Resume ads.
    """
    campaign = await db["ads"].find_one({"id": ad_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    update_doc: Dict[str, Any] = {
        "status": update.status,
        "updated_at": datetime.now(timezone.utc)
    }
    if update.rejection_reason is not None:
        update_doc["rejection_reason"] = update.rejection_reason

    await db["ads"].update_one({"id": ad_id}, {"$set": update_doc})
    return {
        "message": f"Campaign status updated to {update.status}",
        "ad_id": ad_id,
        "status": update.status
    }
