from fastapi import APIRouter, HTTPException, Body
from typing import Optional
from pydantic import BaseModel
from app.services.forecasting import forecasting_service

router = APIRouter()

class PredictionRequest(BaseModel):
    crop: str
    state: str
    district: str
    market: str
    horizonDays: Optional[int] = 7

# We will support a controlled catalog of supported crops derived from database logic
# For this demo, we explicitly support these two seeded crops.
VALID_CROPS = ["tomato", "onion"]

@router.post("/predict")
async def get_crop_prediction(req: PredictionRequest):
    """
    AI Price Predictor Engine
    Uses historical market data and Scikit-Learn RandomForest to generate a 7-day forecast.
    """
    crop_lower = req.crop.lower()
    if crop_lower not in VALID_CROPS:
        return {
            "predictionAvailable": False,
            "errorCode": "CROP_NOT_SUPPORTED",
            "message": f"Crop '{req.crop}' not recognized. Please select a supported crop."
        }
        
    result = await forecasting_service.generate_forecast(
        state=req.state,
        district=req.district,
        market=req.market,
        commodity=req.crop.capitalize(), # Matches DB capitalization
        horizon_days=req.horizonDays
    )
    
    if result.get("predictionAvailable"):
        # Add Gemini logic here if needed, but for now we just return the stats
        # We can calculate % diff for frontend message
        diff = result["predictedPrice"] - result["latestMarketPrice"]
        pct = (diff / result["latestMarketPrice"]) * 100
        
        if pct > 5:
            rec = "HOLD"
            col = "blue"
            msg = f"Prices expected to rise by {pct:.1f}%. Consider holding."
        elif pct < -5:
            rec = "SELL NOW"
            col = "orange"
            msg = f"Prices expected to drop by {abs(pct):.1f}%. Consider selling soon."
        else:
            rec = "STABLE"
            col = "green"
            msg = f"Prices expected to remain stable. Normal market operations."
            
        result["recommendation"] = rec
        result["action_color"] = col
        result["message"] = msg
        
    return result

