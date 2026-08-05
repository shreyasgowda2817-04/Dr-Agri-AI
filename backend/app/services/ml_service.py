import json
from pydantic import BaseModel
from typing import List
from app.core.config import settings

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

class TreatmentPlan(BaseModel):
    fertilizers: List[str]
    pesticides: List[str]
    organic_remedies: List[str]
    preventive_measures: List[str]

class DiseasePrediction(BaseModel):
    disease_name: str
    confidence_score: float
    severity: str
    treatment: TreatmentPlan

def predict_image(image_bytes: bytes) -> dict:
    """
    Sends the image to Google Gemini Vision API for disease classification and treatment mapping.
    """
    if not settings.GEMINI_API_KEY or not genai:
        print("Gemini API Key missing, returning fallback mock data.")
        return {
            "disease_name": "Tomato___Early_blight",
            "confidence_score": 92.5,
            "severity": "High",
            "treatment": {
                "fertilizers": ["Calcium Nitrate"],
                "pesticides": ["Copper Fungicide"],
                "organic_remedies": ["Neem Oil Spray"],
                "preventive_measures": ["Crop rotation", "Proper spacing"]
            }
        }

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    
    prompt = "You are an expert Plant Pathologist AI. Analyze this crop leaf image. Identify the crop name and the specific disease it has. Use the format 'CropName___Disease_name' for disease_name (e.g., 'Tomato___Early_blight'). If it is healthy, return 'CropName___healthy'. Provide a confidence score (0-100), severity level (Low/Medium/High), and a comprehensive treatment plan including recommended fertilizers, pesticides, organic remedies, and preventive measures. Output strictly as JSON."
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'),
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DiseasePrediction,
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error: {e}")
        raise ValueError(f"Failed to analyze image: {e}")
