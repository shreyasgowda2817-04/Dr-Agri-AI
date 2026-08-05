from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class SchemeRequest(BaseModel):
    land_area_acres: float
    state: str

@router.post("/recommend")
async def recommend_schemes(request: SchemeRequest):
    """
    Returns government schemes based on farmer profile.
    """
    schemes = [
        {
            "id": "s1",
            "title": "PM-Kisan Samman Nidhi",
            "description": "₹6,000 per year minimum income support for all landholding farmers.",
            "eligibility": "All landholding farmers",
            "apply_link": "https://pmkisan.gov.in/"
        },
        {
            "id": "s2",
            "title": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            "description": "Crop insurance scheme to provide financial support in case of crop failure.",
            "eligibility": "Farmers growing notified crops in notified areas",
            "apply_link": "https://pmfby.gov.in/"
        }
    ]
    
    # Example logic: Marginal farmers get extra subsidies
    if request.land_area_acres < 2.5:
        schemes.append({
            "id": "s3",
            "title": "Marginal Farmer Equipment Subsidy",
            "description": "Up to 50% subsidy on purchasing tractors and drones for marginal farmers.",
            "eligibility": "Farmers with < 2.5 acres of land",
            "apply_link": "https://agrimachinery.nic.in/"
        })
        
    return schemes
