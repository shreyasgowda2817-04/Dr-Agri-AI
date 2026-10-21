import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from bson import ObjectId
from bson.errors import InvalidId

from app.core.database import get_mongo_db
from app.models.user import UserResponse
from app.models.report import DiseaseReportResponse
from app.api.dependencies import get_current_user

router = APIRouter()


# ── Schemas for Recovery Tracking & Expert Consultation ───────────────────────

class TimelineEventCreate(BaseModel):
    event_type: str = Field(..., description="treatment_applied, foliar_spray, field_inspection, note, followup_scan")
    title: str = Field(..., min_length=2, max_length=100)
    notes: Optional[str] = None
    recovery_status: Optional[str] = Field(None, description="improving, stable, worsening, resolved")
    treatment_name: Optional[str] = None
    cost: Optional[float] = None
    image_url: Optional[str] = None


class ExpertReviewRequest(BaseModel):
    notes: Optional[str] = None
    urgency: Optional[str] = "Normal"  # Normal, High, Critical


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/history")
async def get_user_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    crop: Optional[str] = Query(None),
    diagnostic_status: Optional[str] = Query(None),
    paginated: bool = Query(False),
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Fetch scan reports for the authenticated user, ordered by most recent first.
    Enforces strict user ownership. Supports optional pagination.
    """
    user_id_str = str(current_user.id)
    query: Dict[str, Any] = {"user_id": user_id_str}
    
    if isinstance(crop, str) and crop.strip():
        query["crop_name"] = {"$regex": crop.strip(), "$options": "i"}
    if isinstance(diagnostic_status, str) and diagnostic_status.strip():
        query["diagnostic_status"] = diagnostic_status.strip()

    is_paginated = bool(paginated) if isinstance(paginated, bool) else False
    page_num = int(page) if isinstance(page, int) and page >= 1 else 1
    limit_num = int(limit) if isinstance(limit, int) and 1 <= limit <= 100 else 20

    total = await db["disease_reports"].count_documents(query)
    skip = (page_num - 1) * limit_num
    cursor = db["disease_reports"].find(query).sort("created_at", -1).skip(skip).limit(limit_num)

    reports = await cursor.to_list(length=limit_num)
    valid_reports = []
    for report in reports:
        report["_id"] = str(report["_id"])
        report["id"] = report["_id"]
        try:
            valid_reports.append(DiseaseReportResponse(**report))
        except Exception as e:
            # Fallback mapping if legacy doc is missing required pydantic fields
            report["created_at"] = report.get("created_at") or datetime.now(timezone.utc)
            valid_reports.append(DiseaseReportResponse(**report))

    if is_paginated:
        total_pages = (total + limit_num - 1) // limit_num if total > 0 else 1
        return {
            "items": valid_reports,
            "total": total,
            "page": page_num,
            "limit": limit_num,
            "total_pages": total_pages
        }

    return valid_reports


@router.get("/{report_id}", response_model=DiseaseReportResponse)
async def get_report_by_id(
    report_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Fetch a specific disease report by ID.
    Enforces user ownership to prevent unauthorized cross-farmer access.
    """
    try:
        obj_id = ObjectId(report_id)
        report = await db["disease_reports"].find_one({
            "_id": obj_id,
            "user_id": str(current_user.id)
        })
    except InvalidId:
        # Fallback query by string id if stored that way
        report = await db["disease_reports"].find_one({
            "$or": [{"id": report_id}, {"report_id": report_id}, {"scan_id": report_id}],
            "user_id": str(current_user.id)
        })

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or access denied."
        )

    report["_id"] = str(report["_id"])
    report["id"] = report["_id"]
    return DiseaseReportResponse(**report)


@router.get("/public/{report_id}", response_model=DiseaseReportResponse)
async def get_public_report(
    report_id: str,
    db = Depends(get_mongo_db)
):
    """
    Fetch a public/shared report by ID.
    Sanitizes private owner internals before returning.
    """
    try:
        obj_id = ObjectId(report_id)
        report = await db["disease_reports"].find_one({"_id": obj_id})
    except InvalidId:
        report = await db["disease_reports"].find_one({
            "$or": [{"id": report_id}, {"report_id": report_id}, {"scan_id": report_id}]
        })

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Public report not found or link has expired."
        )

    report["_id"] = str(report["_id"])
    report["id"] = report["_id"]
    # Mask owner id for security
    report["user_id"] = "anonymous-shared"
    return DiseaseReportResponse(**report)


@router.post("/{report_id}/timeline")
async def add_timeline_event(
    report_id: str,
    event: TimelineEventCreate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Appends a farmer action, treatment log, inspection, or follow-up note
    to the report's recovery timeline.
    """
    try:
        obj_id = ObjectId(report_id)
        filter_query = {"_id": obj_id, "user_id": str(current_user.id)}
    except InvalidId:
        filter_query = {"id": report_id, "user_id": str(current_user.id)}

    report = await db["disease_reports"].find_one(filter_query)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or access denied.")

    new_timeline_item = {
        "timeline_id": f"tl-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": event.event_type,
        "title": event.title,
        "notes": event.notes,
        "recovery_status": event.recovery_status,
        "treatment_name": event.treatment_name,
        "cost": event.cost,
        "image_url": event.image_url,
        "recorded_by": current_user.name or "Farmer"
    }

    update_fields: Dict[str, Any] = {
        "updated_at": datetime.now(timezone.utc)
    }
    if event.recovery_status:
        update_fields["current_recovery_status"] = event.recovery_status

    await db["disease_reports"].update_one(
        filter_query,
        {
            "$push": {"recovery_timeline": new_timeline_item},
            "$set": update_fields
        }
    )

    updated_report = await db["disease_reports"].find_one(filter_query)
    updated_report["_id"] = str(updated_report["_id"])
    updated_report["id"] = updated_report["_id"]
    return {
        "success": True,
        "message": "Recovery timeline updated successfully.",
        "timeline_item": new_timeline_item,
        "report": DiseaseReportResponse(**updated_report)
    }


@router.post("/{report_id}/request-expert")
async def request_expert_review(
    report_id: str,
    request: ExpertReviewRequest,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Farmer requests a qualified agronomist review for this diagnosis.
    Enforces report ownership.
    """
    try:
        obj_id = ObjectId(report_id)
        filter_query = {"_id": obj_id, "user_id": str(current_user.id)}
    except InvalidId:
        filter_query = {"id": report_id, "user_id": str(current_user.id)}

    report = await db["disease_reports"].find_one(filter_query)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or access denied.")

    review_data = {
        "status": "pending",
        "requested_at": datetime.now(timezone.utc).isoformat(),
        "farmer_notes": request.notes,
        "urgency": request.urgency or "Normal"
    }

    timeline_item = {
        "timeline_id": f"tl-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": "expert_requested",
        "title": "Expert Review Requested",
        "notes": f"Submitted for Agronomist Verification ({request.urgency} priority)",
        "recorded_by": current_user.name or "Farmer"
    }

    await db["disease_reports"].update_one(
        filter_query,
        {
            "$set": {
                "expert_review": review_data,
                "expert_consultation_required": True,
                "updated_at": datetime.now(timezone.utc)
            },
            "$push": {"recovery_timeline": timeline_item}
        }
    )

    return {
        "success": True,
        "message": "Scan report submitted to the Agronomy Expert queue.",
        "expert_review": review_data
    }


@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """
    Farmer deletes their own report. Enforces strict ownership.
    """
    try:
        obj_id = ObjectId(report_id)
        filter_query = {"_id": obj_id, "user_id": str(current_user.id)}
    except InvalidId:
        filter_query = {"id": report_id, "user_id": str(current_user.id)}

    result = await db["disease_reports"].delete_one(filter_query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found or access denied.")

    return {"success": True, "message": "Report deleted successfully."}
