from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from app.core.database import get_mongo_db
from app.api.dependencies import get_current_user
from app.models.user import UserResponse
from app.core.config import settings
import httpx
import time
import urllib.parse
from pydantic import BaseModel

router = APIRouter()

# Simple in-memory cache to prevent rate limiting
# Key: user_id, Value: {"data": dict, "timestamp": float}
WEATHER_CACHE = {}
CACHE_TTL = 1800 # 30 minutes

class WeatherData(BaseModel):
    temperature: float
    feels_like: float
    humidity: int
    rainfall: float
    wind_speed: float
    weather_condition: str
    cloud_coverage: int
    rain_probability: float
    forecast: str
    retrieved_at: float
    location_name: str

async def fetch_weather_from_api(lat: float, lon: float, api_key: str, requested_location_name: str = None) -> Optional[WeatherData]:
    # OpenWeatherMap OneCall API provides current and forecast, but it might be paid.
    # We will use the free Current Weather API and 5-day/3-hour forecast.
    try:
        async with httpx.AsyncClient() as client:
            # Current weather
            current_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
            current_res = await client.get(current_url, timeout=5.0)
            if current_res.status_code != 200:
                print(f"OpenWeatherMap Current Error: {current_res.text}")
                return None
            
            current_data = current_res.json()
            
            # Forecast weather for rain probability and general forecast
            forecast_url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={api_key}&units=metric"
            forecast_res = await client.get(forecast_url, timeout=5.0)
            forecast_data = forecast_res.json() if forecast_res.status_code == 200 else None
            
            # Extract current info
            temp = current_data.get("main", {}).get("temp", 0)
            feels_like = current_data.get("main", {}).get("feels_like", 0)
            humidity = current_data.get("main", {}).get("humidity", 0)
            wind_speed = current_data.get("wind", {}).get("speed", 0)
            clouds = current_data.get("clouds", {}).get("all", 0)
            
            weather_desc = "Unknown"
            if current_data.get("weather") and len(current_data["weather"]) > 0:
                weather_desc = current_data["weather"][0].get("description", "Unknown").title()
                
            rain_1h = current_data.get("rain", {}).get("1h", 0)
            location_name = requested_location_name if requested_location_name else current_data.get("name", "Unknown Location")
            
            # Extract forecast info
            rain_prob = 0.0
            forecast_desc = "No forecast available"
            if forecast_data and "list" in forecast_data and len(forecast_data["list"]) > 0:
                next_forecast = forecast_data["list"][0]
                rain_prob = next_forecast.get("pop", 0) * 100 # pop is Probability of Precipitation (0 to 1)
                if next_forecast.get("weather") and len(next_forecast["weather"]) > 0:
                    forecast_desc = next_forecast["weather"][0].get("description", "").title()
            
            return WeatherData(
                temperature=temp,
                feels_like=feels_like,
                humidity=humidity,
                rainfall=rain_1h,
                wind_speed=wind_speed,
                weather_condition=weather_desc,
                cloud_coverage=clouds,
                rain_probability=rain_prob,
                forecast=forecast_desc,
                retrieved_at=time.time(),
                location_name=location_name
            )
            
    except Exception as e:
        print(f"Error fetching weather: {e}")
        return None

async def geocode_location(location_str: str, api_key: str):
    # Geocode using OpenWeatherMap Geocoding API
    try:
        # append ", IN" or ", Karnataka, IN" to improve accuracy for Indian farmers
        query = urllib.parse.quote(f"{location_str}, Karnataka, IN")
        url = f"http://api.openweathermap.org/geo/1.0/direct?q={query}&limit=1&appid={api_key}"
        async with httpx.AsyncClient() as client:
            res = await client.get(url, timeout=5.0)
            if res.status_code == 200:
                data = res.json()
                if data and len(data) > 0:
                    return data[0]["lat"], data[0]["lon"]
    except Exception as e:
        print(f"Geocoding error: {e}")
    return None, None

async def get_weather_for_user_internal(current_user: UserResponse, db) -> Optional[WeatherData]:
    user_id = str(current_user.id)
    now = time.time()
    
    # Check cache
    if user_id in WEATHER_CACHE:
        cache_entry = WEATHER_CACHE[user_id]
        if now - cache_entry["timestamp"] < CACHE_TTL:
            return cache_entry["data"]
            
    api_key = getattr(settings, "OPENWEATHERMAP_API_KEY", None)
    if not api_key:
        print("Missing OPENWEATHERMAP_API_KEY")
        return None
        
    lat, lon = None, None
    location_name = None
    
    # Try to get from farm plots first
    farms = await db["farm_plots"].find({"user_id": user_id}).to_list(1)
    if farms and len(farms) > 0:
        farm = farms[0]
        if "location_lat" in farm and "location_lon" in farm:
            lat = float(farm["location_lat"])
            lon = float(farm["location_lon"])
        elif "village" in farm:
            location_name = farm["village"]
            
    # Fallback to user location
    if lat is None and lon is None:
        if location_name is None:
            location_name = current_user.district or current_user.location or current_user.village
            
        if location_name:
            lat, lon = await geocode_location(location_name, api_key)
            
    if lat is None or lon is None:
        return None
        
    weather_data = await fetch_weather_from_api(lat, lon, api_key, requested_location_name=location_name)
    if weather_data:
        WEATHER_CACHE[user_id] = {"data": weather_data, "timestamp": now}
        
    return weather_data

@router.get("")
async def get_current_user_weather(
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    weather = await get_weather_for_user_internal(current_user, db)
    if not weather:
        raise HTTPException(status_code=404, detail="Weather data temporarily unavailable or location invalid.")
    return weather


import urllib.request
import urllib.parse
import json
import ssl

def get_weather_code_status(code: int) -> str:
    # WMO Weather interpretation codes (0-99)
    if code == 0: return "Clear sky"
    elif code in [1, 2, 3]: return "Mainly clear, partly cloudy, and overcast"
    elif code in [45, 48]: return "Fog and depositing rime fog"
    elif code in [51, 53, 55]: return "Drizzle"
    elif code in [56, 57]: return "Freezing Drizzle"
    elif code in [61, 63, 65]: return "Rain"
    elif code in [66, 67]: return "Freezing Rain"
    elif code in [71, 73, 75]: return "Snow fall"
    elif code == 77: return "Snow grains"
    elif code in [80, 81, 82]: return "Rain showers"
    elif code in [85, 86]: return "Snow showers"
    elif code == 95: return "Thunderstorm"
    elif code in [96, 99]: return "Thunderstorm with hail"
    return "Unknown"

@router.get("/forecast")
async def get_weather_forecast(lat: float = None, lon: float = None, city: str = None):
    # If city is provided but lat/lon are not, geocode the city using Nominatim
    if city and (lat is None or lon is None):
        try:
            geo_url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(city)}"
            geo_req = urllib.request.Request(geo_url, headers={"User-Agent": "Dr Agri-CropManager/1.0"})
            ssl_context = ssl._create_unverified_context()
            with urllib.request.urlopen(geo_req, timeout=5.0, context=ssl_context) as response:
                data = json.loads(response.read().decode())
                if data and len(data) > 0:
                    lat = float(data[0]["lat"])
                    lon = float(data[0]["lon"])
                else:
                    raise HTTPException(status_code=404, detail="City not found for geocoding")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Geocoding failed: {str(e)}")

    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="Must provide either lat/lon or city")

    # Fetch hyper-local weather from Open-Meteo
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max&timezone=auto"
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Dr Agri-CropManager/1.0"})
        ssl_context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=10.0, context=ssl_context) as response:
            weather_data = json.loads(response.read().decode())
            return weather_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weather fetching failed: {str(e)}")
