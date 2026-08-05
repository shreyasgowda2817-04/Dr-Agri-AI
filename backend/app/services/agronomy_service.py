def predict_yield(crop_type: str, area_acres: float, n: float, p: float, k: float, ph: float) -> dict:
    """
    Predicts crop yield based on soil metrics and area size.
    In a real ML environment, this would be a Random Forest or XGBoost model.
    Here we use an empirical algorithmic approximation.
    """
    # Base yield per acre in Tons
    base_yields = {
        "tomato": 25.0,
        "potato": 20.0,
        "wheat": 3.5,
        "corn": 4.2,
        "rice": 3.8
    }
    
    crop = crop_type.lower()
    base = base_yields.get(crop, 10.0) # Default 10 tons if unknown
    
    # Calculate Soil Health Multiplier (0.0 to 1.5)
    # Ideal NPK depends on crop, but generally we want balanced levels
    health_score = 1.0
    
    if n < 40: health_score -= 0.2
    if p < 20: health_score -= 0.1
    if k < 20: health_score -= 0.1
    
    if ph < 5.5 or ph > 7.5:
        health_score -= 0.3
        
    health_score = max(0.1, health_score)
    
    predicted_yield_per_acre = base * health_score
    total_yield = predicted_yield_per_acre * area_acres
    
    return {
        "crop_type": crop_type,
        "area_acres": area_acres,
        "soil_health_score": round(health_score * 100, 1),
        "predicted_yield_tons": round(total_yield, 2),
        "recommendation": get_fertilizer_recommendation(n, p, k, ph)
    }

def get_fertilizer_recommendation(n: float, p: float, k: float, ph: float) -> str:
    recs = []
    if n < 40: recs.append("Add Urea or Nitrogen-rich fertilizer.")
    if p < 20: recs.append("Add Phosphorus (e.g., DAP).")
    if k < 20: recs.append("Add Potassium (e.g., MOP).")
    if ph < 5.5: recs.append("Soil is acidic; apply agricultural lime.")
    elif ph > 7.5: recs.append("Soil is alkaline; apply elemental sulfur.")
    
    if not recs:
        return "Soil metrics are excellent. No major amendments needed."
    return " ".join(recs)

def calculate_irrigation(crop_type: str, temp_celsius: float, soil_type: str, area_acres: float) -> dict:
    """
    Returns a 7-day irrigation schedule (Liters per day).
    """
    # Base water need in Liters per acre per day
    base_water = {
        "tomato": 4000,
        "potato": 3500,
        "wheat": 5000,
        "corn": 6000,
        "rice": 12000
    }
    
    crop = crop_type.lower()
    daily_base = base_water.get(crop, 5000)
    
    # Adjust for temp (Evapotranspiration multiplier)
    if temp_celsius > 35:
        daily_base *= 1.4
    elif temp_celsius > 28:
        daily_base *= 1.2
    elif temp_celsius < 15:
        daily_base *= 0.6
        
    # Adjust for soil retention
    if soil_type.lower() == "sandy":
        daily_base *= 1.3 # Drains fast
    elif soil_type.lower() == "clay":
        daily_base *= 0.8 # Retains water
        
    total_daily_liters = daily_base * area_acres
    
    schedule = []
    # Generate 7 day forecast (mocking slight variations in temp/evaporation)
    import random
    for i in range(7):
        variance = random.uniform(0.9, 1.1)
        schedule.append({
            "day": f"Day {i+1}",
            "liters_recommended": round(total_daily_liters * variance, 0)
        })
        
    return {
        "daily_average_liters": round(total_daily_liters, 0),
        "schedule": schedule
    }
