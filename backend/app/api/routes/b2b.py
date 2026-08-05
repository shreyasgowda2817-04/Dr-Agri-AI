from fastapi import APIRouter, Depends, HTTPException, Header
from app.core.database import get_mongo_db
from app.models.mongo_models import MongoOrganization
import random
from datetime import datetime, timezone

router = APIRouter()

# Simulated database of valid API keys for B2B partners
VALID_B2B_KEYS = {
    "sk_bank_12345": "State Bank of India",
    "sk_ins_98765": "HDFC Ergo Crop Insurance"
}

def verify_b2b_api_key(x_api_key: str = Header(None)):
    if not x_api_key or x_api_key not in VALID_B2B_KEYS:
        raise HTTPException(status_code=401, detail="Invalid or missing B2B API Key")
    return VALID_B2B_KEYS[x_api_key]

@router.get("/insurance/score/{farmer_id}")
async def get_farmer_health_score(
    farmer_id: str,
    partner_name: str = Depends(verify_b2b_api_key),
    db = Depends(get_mongo_db)
):
    """
    B2B Endpoint: Returns the calculated Farm Health Score for a given farmer.
    Used by banks for loan approvals and insurance companies for underwriting.
    """
    # 1. Base Score
    base_score = 700
    score = base_score
    details = []

    # 2. Check Farm Registration
    farms = await db["farm_plots"].find({"user_id": farmer_id}).to_list(length=100)
    if not farms:
        score -= 100
        details.append("No farm plots registered (-100)")
    else:
        score += 50
        details.append("Farm plots registered (+50)")
        
        # Check if they logged soil type and water source
        good_data = any(f.get("soil_type") and f.get("water_source") for f in farms)
        if good_data:
            score += 30
            details.append("Detailed farm telemetry (+30)")

    # 3. Check Crop Logs
    crops = await db["crops"].find({"user_id": farmer_id}).to_list(length=100)
    if crops:
        score += 50
        details.append("Active crop cycle tracking (+50)")
    else:
        score -= 50
        details.append("No active crops logged (-50)")

    # 4. Check Disease Reports (MongoDB)
    disease_count = await db["disease_reports"].count_documents({"user_id": farmer_id})
    if disease_count > 5:
        penalty = min((disease_count - 5) * 10, 150) # Max 150 point penalty
        score -= penalty
        details.append(f"High frequency of disease scans: {disease_count} scans (-{penalty})")
    elif disease_count > 0:
        score += 20
        details.append("Proactive disease monitoring (+20)")

    # Ensure score stays within 0-1000
    score = max(0, min(1000, score))
    
    # Determine risk tier
    if score >= 750:
        risk_tier = "Low Risk (Prime)"
    elif score >= 600:
        risk_tier = "Medium Risk (Standard)"
    else:
        risk_tier = "High Risk (Subprime)"

    return {
        "farmer_id": farmer_id,
        "requested_by": partner_name,
        "health_score": score,
        "risk_tier": risk_tier,
        "factors": details
    }

@router.get("/partners")
async def get_b2b_partners(db = Depends(get_mongo_db)):
    """
    B2B Dashboard: Returns aggregate data for all registered FPOs (Farmer Producer Organizations)
    so buyers can bid on bulk crop yields based on health scores.
    """
    # 1. Fetch all Organizations
    orgs = await db["organizations"].find().to_list(length=100)
    
    # If no orgs exist, seed a dummy FPO so the UI works for demonstration
    if not orgs:
        dummy_org = MongoOrganization(name="Nashik Grape Growers FPO", org_type="FPO")
        await db["organizations"].insert_one(dummy_org.model_dump())
        orgs = [dummy_org.model_dump()]

    partners = []
    
    for org in orgs:
        # 2. Get all farmers in this org
        members = await db["org_members"].find({"org_id": org["id"]}).to_list(length=100)
        farmer_ids = [m["user_id"] for m in members]
        
        # 3. Calculate Aggregate Health Score and Active Crops
        total_score = 0
        crop_summaries = []
        
        if farmer_ids:
            # Simple simulation: in reality we would call get_farmer_health_score for each
            # For performance in MVP, we just assign a high score if they are in an FPO
            avg_score = 850
            
            # Fetch crops for these farmers
            crops = await db["crops"].find({"user_id": {"$in": farmer_ids}}).to_list(length=100)
            
            crop_names = set(c.get("crop_name", "Unknown") for c in crops)
            for c_name in crop_names:
                # Group by crop
                matching_crops = [c for c in crops if c.get("crop_name") == c_name]
                total_area = sum(c.get("area_acres", 5) for c in matching_crops)
                
                crop_summaries.append({
                    "name": c_name,
                    "disease_risk": "Low" if random.random() > 0.3 else "Medium",
                    "volume_tons": round(total_area * 2.5, 1) # ~2.5 tons per acre
                })
        else:
            avg_score = 720 # Default score
            
        if not crop_summaries:
            # Fallback crops for display
            crop_summaries = [
                {"name": "Export Quality Grapes", "disease_risk": "Low", "volume_tons": 140.5},
                {"name": "Pomegranate (Bhagwa)", "disease_risk": "Medium", "volume_tons": 65.2}
            ]

        partners.append({
            "id": org["id"],
            "name": org["name"],
            "organization_type": org["org_type"],
            "farm_health_score": round(avg_score / 10), # Out of 100 for UI
            "available_crops": crop_summaries
        })
        
    return partners
