from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from app.api.dependencies import get_mongo_db, get_current_user, RequireRole
from app.models.user import UserResponse, UserRole
import uuid

router = APIRouter()

class SchemeBase(BaseModel):
    title: str
    description: str
    eligibility: str
    apply_link: str
    max_land_area_acres: Optional[float] = None
    state: Optional[str] = None

class SchemeCreate(SchemeBase):
    pass

class SchemeResponse(SchemeBase):
    id: str

class SchemeRequest(BaseModel):
    land_area_acres: float
    state: str

@router.get("/", response_model=List[SchemeResponse])
async def list_all_schemes(db = Depends(get_mongo_db)):
    cursor = db["schemes"].find({})
    schemes = await cursor.to_list(length=100)
    for s in schemes:
        s["_id"] = str(s["_id"])
    return schemes

@router.post("/", response_model=SchemeResponse)
async def create_scheme(
    scheme: SchemeCreate, 
    current_user: UserResponse = Depends(RequireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db = Depends(get_mongo_db)
):
    scheme_dict = scheme.model_dump()
    scheme_dict["id"] = str(uuid.uuid4())
    await db["schemes"].insert_one(scheme_dict)
    scheme_dict["_id"] = str(scheme_dict.pop("_id", ""))
    return scheme_dict

@router.delete("/{scheme_id}")
async def delete_scheme(
    scheme_id: str,
    current_user: UserResponse = Depends(RequireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN])),
    db = Depends(get_mongo_db)
):
    await db["schemes"].delete_one({"id": scheme_id})
    return {"message": "Scheme deleted successfully"}

@router.post("/recommend", response_model=List[SchemeResponse])
async def recommend_schemes(request: SchemeRequest, db = Depends(get_mongo_db)):
    query = {}
    
    if request.land_area_acres:
        query["$or"] = [
            {"max_land_area_acres": {"$exists": False}},
            {"max_land_area_acres": None},
            {"max_land_area_acres": {"$gte": request.land_area_acres}}
        ]
        
    cursor = db["schemes"].find(query)
    schemes = await cursor.to_list(length=20)
    
    for s in schemes:
        s["_id"] = str(s["_id"])
    return schemes
