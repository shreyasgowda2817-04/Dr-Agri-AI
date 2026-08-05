from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user
from app.models.user import UserResponse
from app.models.mongo_models import MongoFarmPlot, MongoCrop

router = APIRouter()

# ── Schemas ──────────────────────────────────────────────────────────────────

class FarmCreate(BaseModel):
    name: str
    area_acres: float
    crop: str = "Mixed"
    status: str = "Active"
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    soil_type: Optional[str] = None       # Clay | Loamy | Sandy | Silty | Peaty | Chalky
    water_source: Optional[str] = None    # Canal | Borewell | River | Rainwater | Tank
    irrigation_type: Optional[str] = None # Drip | Sprinkler | Flood | Manual
    description: Optional[str] = None

class FarmUpdate(FarmCreate):
    pass

class CropCreate(BaseModel):
    farm_id: str
    crop_name: str
    variety: Optional[str] = None
    planting_date: Optional[str] = None        # ISO date string YYYY-MM-DD
    expected_harvest_date: Optional[str] = None
    crop_stage: Optional[str] = None           # Seedling | Vegetative | Flowering | Fruiting | Harvest
    area_acres: Optional[float] = None
    notes: Optional[str] = None

class CropUpdate(CropCreate):
    farm_id: str = ""


# ── Farm Routes ───────────────────────────────────────────────────────────────

@router.get("/health-score")
async def get_my_health_score(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Calculate the health score for the logged-in farmer."""
    farmer_id = str(current_user.id)
    base_score = 700
    score = base_score
    details = []

    farms = await db["farm_plots"].find({"user_id": farmer_id}).to_list(length=100)
    if not farms:
        score -= 100
        details.append("No farm plots registered (-100)")
    else:
        score += 50
        details.append("Farm plots registered (+50)")
        if any(f.get("soil_type") and f.get("water_source") for f in farms):
            score += 30
            details.append("Detailed farm telemetry (+30)")

    crops = await db["crops"].find({"user_id": farmer_id}).to_list(length=100)
    if crops:
        score += 50
        details.append("Active crop cycle tracking (+50)")
    else:
        score -= 50
        details.append("No active crops logged (-50)")

    disease_count = await db["disease_reports"].count_documents({"user_id": farmer_id})
    if disease_count > 5:
        penalty = min((disease_count - 5) * 10, 150)
        score -= penalty
        details.append(f"High frequency of disease scans (-{penalty})")
    elif disease_count > 0:
        score += 20
        details.append("Proactive disease monitoring (+20)")

    score = max(0, min(1000, score))
    return {
        "score": score,
        "max_score": 1000,
        "details": details
    }


@router.get("/farms")
async def list_farms(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Return all farms for the current user, each with their crops."""
    farms = await db["farm_plots"].find({"user_id": str(current_user.id)}).to_list(length=100)
    output = []
    for f in farms:
        # Load crops for each farm
        crops = await db["crops"].find({"farm_id": f["id"]}).to_list(length=100)
        
        f["crops"] = [_serialize_crop(c) for c in crops]
        f["created_at"] = f.get("created_at").isoformat() if f.get("created_at") else None
        
        # Remove mongo _id
        if "_id" in f: del f["_id"]
        output.append(f)
    return output


@router.post("/farms", status_code=status.HTTP_201_CREATED)
async def create_farm(
    data: FarmCreate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Create a new farm for the current user."""
    farm = MongoFarmPlot(
        user_id=str(current_user.id),
        name=data.name,
        area_acres=data.area_acres,
        crop=data.crop,
        status=data.status,
        location_name=data.location_name,
        latitude=data.latitude,
        longitude=data.longitude,
        soil_type=data.soil_type,
        water_source=data.water_source,
        irrigation_type=data.irrigation_type,
        description=data.description,
        created_at=datetime.now(timezone.utc)
    )
    farm_dict = farm.model_dump()
    await db["farm_plots"].insert_one(farm_dict)
    return {"id": farm_dict["id"], "name": farm_dict["name"], "message": "Farm created successfully"}


@router.put("/farms/{farm_id}")
async def update_farm(
    farm_id: str,
    data: FarmUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Update a farm owned by the current user."""
    farm = await db["farm_plots"].find_one({"id": farm_id, "user_id": str(current_user.id)})
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        await db["farm_plots"].update_one(
            {"id": farm_id},
            {"$set": update_data}
        )

    return {"message": "Farm updated", "id": farm_id}


@router.delete("/farms/{farm_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_farm(
    farm_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Delete a farm and all its crops."""
    farm = await db["farm_plots"].find_one({"id": farm_id, "user_id": str(current_user.id)})
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
        
    await db["farm_plots"].delete_one({"id": farm_id})
    await db["crops"].delete_many({"farm_id": farm_id})

@router.get("/geocode")
async def geocode_location(q: str):
    import urllib.request
    import json
    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(q)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Dr Agri-CropManager/1.0"})
        with urllib.request.urlopen(req, timeout=5.0) as response:
            data = json.loads(response.read().decode())
            if data and len(data) > 0:
                return {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}
            return {"error": "Not found"}
    except Exception as e:
        return {"error": str(e)}


# ── Crop Routes ───────────────────────────────────────────────────────────────

def _serialize_crop(c: dict) -> dict:
    return {
        "id": c.get("id"),
        "farm_id": c.get("farm_id"),
        "crop_name": c.get("crop_name"),
        "variety": c.get("variety"),
        "planting_date": c.get("planting_date").isoformat() if c.get("planting_date") and hasattr(c.get("planting_date"), "isoformat") else None,
        "expected_harvest_date": c.get("expected_harvest_date").isoformat() if c.get("expected_harvest_date") and hasattr(c.get("expected_harvest_date"), "isoformat") else None,
        "crop_stage": c.get("crop_stage"),
        "area_acres": c.get("area_acres"),
        "notes": c.get("notes"),
        "images": c.get("images") or [],
        "is_active": c.get("is_active"),
        "created_at": c.get("created_at").isoformat() if c.get("created_at") and hasattr(c.get("created_at"), "isoformat") else None,
    }


@router.get("/crops")
async def list_crops(
    farm_id: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Return all crops for the current user, optionally filtered by farm."""
    query = {"user_id": str(current_user.id)}
    if farm_id:
        query["farm_id"] = farm_id
        
    crops_cursor = db["crops"].find(query).sort("created_at", -1)
    crops = await crops_cursor.to_list(length=100)
    return [_serialize_crop(c) for c in crops]


@router.post("/crops", status_code=status.HTTP_201_CREATED)
async def create_crop(
    data: CropCreate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Add a new crop to a farm."""
    # Verify farm belongs to user
    farm = await db["farm_plots"].find_one({"id": data.farm_id, "user_id": str(current_user.id)})
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found or access denied")

    from datetime import date
    def parse_date(s):
        if not s: return None
        dt = datetime.fromisoformat(s)
        return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)

    crop = MongoCrop(
        farm_id=data.farm_id,
        user_id=str(current_user.id),
        crop_name=data.crop_name,
        variety=data.variety,
        planting_date=parse_date(data.planting_date),
        expected_harvest_date=parse_date(data.expected_harvest_date),
        crop_stage=data.crop_stage,
        area_acres=data.area_acres,
        notes=data.notes,
        images=[],
        created_at=datetime.now(timezone.utc)
    )
    crop_dict = crop.model_dump()
    await db["crops"].insert_one(crop_dict)
    return _serialize_crop(crop_dict)


@router.put("/crops/{crop_id}")
async def update_crop(
    crop_id: str,
    data: CropUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Update a crop."""
    crop = await db["crops"].find_one({"id": crop_id, "user_id": str(current_user.id)})
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")

    from datetime import date
    update_data = data.model_dump(exclude_unset=True)
    
    for field in ("planting_date", "expected_harvest_date"):
        if field in update_data and isinstance(update_data[field], str):
            if update_data[field]:
                dt = datetime.fromisoformat(update_data[field])
                update_data[field] = datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)
            else:
                update_data[field] = None
                
    if update_data:
        await db["crops"].update_one(
            {"id": crop_id},
            {"$set": update_data}
        )
        
    updated_crop = await db["crops"].find_one({"id": crop_id})
    return _serialize_crop(updated_crop)


@router.delete("/crops/{crop_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_crop(
    crop_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    """Delete a crop."""
    crop = await db["crops"].find_one({"id": crop_id, "user_id": str(current_user.id)})
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
        
    await db["crops"].delete_one({"id": crop_id})
