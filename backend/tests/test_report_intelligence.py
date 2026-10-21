import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from bson import ObjectId

from app.models.report import DiseaseReportBase, DiseaseReportResponse
from app.models.user import UserResponse
from app.api.routes.reports import (
    get_user_reports,
    get_report_by_id,
    get_public_report,
    add_timeline_event,
    request_expert_review,
    delete_report,
    TimelineEventCreate,
    ExpertReviewRequest
)
from fastapi import HTTPException


@pytest.fixture
def mock_farmer():
    return UserResponse(
        id="farmer_123",
        name="Ramesh Kumar",
        email="ramesh@example.com",
        role="farmer",
        is_active=True,
        tier="basic"
    )


@pytest.fixture
def mock_other_farmer():
    return UserResponse(
        id="farmer_456",
        name="Suresh Patel",
        email="suresh@example.com",
        role="farmer",
        is_active=True,
        tier="basic"
    )


def test_disease_report_schema_full_intelligence():
    """Verify that DiseaseReportResponse properly validates and serializes all v2.5 intelligence fields."""
    sample_id = str(ObjectId())
    report_dict = {
        "_id": sample_id,
        "id": sample_id,
        "user_id": "farmer_123",
        "image_url": "https://cloudinary.com/scan123.jpg",
        "scan_id": "SCAN-20261021-A1B2C3",
        "schema_version": "v2.5",
        "farm_plot_id": "plot_north_4",
        "farm_plot_name": "North Tomato Acre",
        "diagnostic_status": "preliminary",
        "crop_name": "Tomato",
        "disease_name": "Early Blight",
        "confidence_score": 88.5,
        "severity": "High",
        "disease_category": "fungal",
        "affected_area_percentage": 18.5,
        "differential_diagnoses": [
            {"condition": "Late Blight", "confidence": 18.0, "distinguishing_factors": "Water-soaked lesions on leaf undersides"},
            {"condition": "Septoria Leaf Spot", "confidence": 8.0, "distinguishing_factors": "Smaller spots with dark margins"}
        ],
        "evidence_notes": "Concentric rings (target-like pattern) observed on lower foliage.",
        "uncertainty_warning": None,
        "recovery_plan": {
            "immediate_actions": ["Prune lower infected leaves", "Disinfect tools"],
            "next_3_days": ["Apply Copper Oxychloride 50 WP @ 2.5g/L"],
            "next_7_days": ["Apply foliar NPK 19:19:19 for canopy recovery"],
            "follow_up_monitoring": ["Perform follow-up scan in 7-10 days"]
        },
        "weather_intelligence": {
            "source": "Open-Meteo",
            "temperature": 24.5,
            "humidity": 68,
            "wind_speed": 7.2,
            "rain_probability": 10,
            "condition": "Optimal",
            "spray_window": {
                "status": "optimal",
                "recommended_time": "Tomorrow, 6:00 AM - 8:30 AM",
                "reason": "Calm winds, safe temp, zero rain"
            }
        },
        "model_info": {
            "provider": "Google Gemini",
            "model_id": "gemini-2.5-flash",
            "report_version": "v2.5",
            "calibrated": False
        },
        "recovery_timeline": [
            {
                "timeline_id": "tl-1",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event_type": "initial_scan",
                "title": "Initial Diagnostic Scan"
            }
        ],
        "created_at": datetime.now(timezone.utc)
    }

    report = DiseaseReportResponse(**report_dict)
    assert report.id == sample_id
    assert report.scan_id == "SCAN-20261021-A1B2C3"
    assert report.disease_category == "fungal"
    assert report.affected_area_percentage == 18.5
    assert len(report.differential_diagnoses) == 2
    assert report.weather_intelligence["spray_window"]["status"] == "optimal"
    assert report.model_info["provider"] == "Google Gemini"


@pytest.mark.asyncio
async def test_get_user_reports_pagination_and_ownership(mock_farmer):
    """Verify that get_user_reports filters strictly by the authenticated user's ID."""
    mock_db = MagicMock()
    mock_cursor = MagicMock()

    sample_id = ObjectId()
    mock_docs = [
        {
            "_id": sample_id,
            "id": str(sample_id),
            "user_id": mock_farmer.id,
            "image_url": "https://img.jpg",
            "crop_name": "Tomato",
            "disease_name": "Early Blight",
            "confidence_score": 85.0,
            "severity": "Medium",
            "created_at": datetime.now(timezone.utc)
        }
    ]

    mock_db["disease_reports"].count_documents = AsyncMock(return_value=1)
    mock_db["disease_reports"].find.return_value = mock_cursor
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.skip.return_value = mock_cursor
    mock_cursor.limit.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=mock_docs)

    # Test list format (backward compatible)
    res_list = await get_user_reports(page=1, limit=20, paginated=False, current_user=mock_farmer, db=mock_db)
    assert len(res_list) == 1
    assert res_list[0].crop_name == "Tomato"

    # Test paginated format
    res_paginated = await get_user_reports(page=1, limit=20, paginated=True, current_user=mock_farmer, db=mock_db)
    assert res_paginated["total"] == 1
    assert res_paginated["page"] == 1
    assert len(res_paginated["items"]) == 1

    # Verify query strictly matched authenticated user
    call_query = mock_db["disease_reports"].find.call_args[0][0]
    assert call_query["user_id"] == mock_farmer.id


@pytest.mark.asyncio
async def test_get_report_by_id_ownership_protection(mock_farmer, mock_other_farmer):
    """Verify that a farmer cannot view another farmer's scan report via ID guessing."""
    mock_db = MagicMock()
    report_id = str(ObjectId())

    # Report belongs to other farmer
    mock_db["disease_reports"].find_one = AsyncMock(return_value=None)

    with pytest.raises(HTTPException) as exc_info:
        await get_report_by_id(report_id=report_id, current_user=mock_farmer, db=mock_db)

    assert exc_info.value.status_code == 404
    assert "not found or access denied" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_get_public_report_anonymizes_owner():
    """Verify that the public sharing endpoint masks internal owner details."""
    mock_db = MagicMock()
    sample_oid = ObjectId()
    mock_doc = {
        "_id": sample_oid,
        "id": str(sample_oid),
        "user_id": "secret_internal_user_999",
        "image_url": "https://img.jpg",
        "crop_name": "Rice",
        "disease_name": "Brown Spot",
        "confidence_score": 90.0,
        "severity": "Low",
        "created_at": datetime.now(timezone.utc)
    }
    mock_db["disease_reports"].find_one = AsyncMock(return_value=mock_doc)

    public_res = await get_public_report(report_id=str(sample_oid), db=mock_db)
    assert public_res.user_id == "anonymous-shared"
    assert public_res.crop_name == "Rice"


@pytest.mark.asyncio
async def test_add_timeline_recovery_event(mock_farmer):
    """Verify logging a recovery milestone, farmer action, and status update."""
    mock_db = MagicMock()
    sample_oid = ObjectId()
    existing_doc = {
        "_id": sample_oid,
        "id": str(sample_oid),
        "user_id": mock_farmer.id,
        "image_url": "https://img.jpg",
        "crop_name": "Chili",
        "disease_name": "Leaf Curl",
        "recovery_timeline": [],
        "created_at": datetime.now(timezone.utc)
    }

    mock_db["disease_reports"].find_one = AsyncMock(side_effect=[
        existing_doc,
        {**existing_doc, "recovery_timeline": [{"title": "Sprayed Neem Oil", "recovery_status": "improving"}]}
    ])
    mock_db["disease_reports"].update_one = AsyncMock()

    event = TimelineEventCreate(
        event_type="foliar_spray",
        title="Sprayed Neem Oil",
        notes="Applied 4ml/L with foliar misting",
        recovery_status="improving",
        treatment_name="Cold-pressed Neem Oil 1500ppm",
        cost=180.0
    )

    res = await add_timeline_event(report_id=str(sample_oid), event=event, current_user=mock_farmer, db=mock_db)
    assert res["success"] is True
    assert res["timeline_item"]["title"] == "Sprayed Neem Oil"
    assert res["timeline_item"]["cost"] == 180.0
    assert mock_db["disease_reports"].update_one.called


@pytest.mark.asyncio
async def test_request_expert_review(mock_farmer):
    """Verify submitting a report for agronomist confirmation."""
    mock_db = MagicMock()
    sample_oid = ObjectId()
    existing_doc = {
        "_id": sample_oid,
        "id": str(sample_oid),
        "user_id": mock_farmer.id,
        "image_url": "https://img.jpg",
        "crop_name": "Wheat",
        "disease_name": "Rust",
        "created_at": datetime.now(timezone.utc)
    }

    mock_db["disease_reports"].find_one = AsyncMock(return_value=existing_doc)
    mock_db["disease_reports"].update_one = AsyncMock()

    req = ExpertReviewRequest(notes="Unsure if Yellow Rust or Brown Rust", urgency="High")
    res = await request_expert_review(report_id=str(sample_oid), request=req, current_user=mock_farmer, db=mock_db)

    assert res["success"] is True
    assert res["expert_review"]["status"] == "pending"
    assert res["expert_review"]["urgency"] == "High"
    assert mock_db["disease_reports"].update_one.called


@pytest.mark.asyncio
async def test_delete_report_ownership(mock_farmer):
    """Verify that deleting a report enforces ownership."""
    mock_db = MagicMock()
    sample_oid = ObjectId()

    mock_db["disease_reports"].delete_one = AsyncMock(return_value=MagicMock(deleted_count=1))
    res = await delete_report(report_id=str(sample_oid), current_user=mock_farmer, db=mock_db)
    assert res["success"] is True

    # If delete fails (e.g. wrong owner)
    mock_db["disease_reports"].delete_one = AsyncMock(return_value=MagicMock(deleted_count=0))
    with pytest.raises(HTTPException) as exc_info:
        await delete_report(report_id=str(sample_oid), current_user=mock_farmer, db=mock_db)
    assert exc_info.value.status_code == 404
