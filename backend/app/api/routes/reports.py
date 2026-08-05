from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.core.database import get_db
from app.models.user import UserResponse
from app.models.report import DiseaseReportResponse
from app.api.dependencies import get_current_user

router = APIRouter()

@router.get("/history", response_model=List[DiseaseReportResponse])
async def get_user_reports(current_user: UserResponse = Depends(get_current_user)):
    """
    Fetch all disease scan reports for the authenticated user, ordered by most recent first.
    """
    db = get_db()
    cursor = db["disease_reports"].find({"user_id": current_user.id}).sort("created_at", -1)
    
    reports = await cursor.to_list(length=100) # Limit to 100 recent scans for performance
    for report in reports:
        report["_id"] = str(report["_id"])
    
    return [DiseaseReportResponse(**report) for report in reports]

@router.get("/{report_id}", response_model=DiseaseReportResponse)
async def get_report_by_id(report_id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Fetch a specific disease report by ID.
    """
    from bson import ObjectId
    from bson.errors import InvalidId
    
    try:
        obj_id = ObjectId(report_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Report ID format.")
        
    db = get_db()
    report = await db["disease_reports"].find_one({"_id": obj_id, "user_id": current_user.id})
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or access denied.")
    report["_id"] = str(report["_id"])    
    return DiseaseReportResponse(**report)

@router.get("/public/{report_id}", response_model=DiseaseReportResponse)
async def get_public_report(report_id: str):
    """
    Fetch a specific disease report by ID without authentication for public sharing.
    """
    from bson import ObjectId
    from bson.errors import InvalidId
    
    try:
        obj_id = ObjectId(report_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Report ID format.")
        
    db = get_db()
    report = await db["disease_reports"].find_one({"_id": obj_id})
    
    if not report:
        raise HTTPException(status_code=404, detail="Public report not found.")
    report["_id"] = str(report["_id"])    
    return DiseaseReportResponse(**report)
