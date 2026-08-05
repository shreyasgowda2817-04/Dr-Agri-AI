from fastapi import APIRouter, HTTPException
import urllib.request
import urllib.parse
import json
import ssl

router = APIRouter()

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
async def get_weather(lat: float = None, lon: float = None, city: str = None):
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
    # Timezone auto sets to the local timezone of the coordinates
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max&timezone=auto"
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Dr Agri-CropManager/1.0"})
        ssl_context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, timeout=10.0, context=ssl_context) as response:
            weather_data = json.loads(response.read().decode())
            return weather_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weather fetching failed: {str(e)}")
