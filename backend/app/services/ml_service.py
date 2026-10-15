import os
import json
import httpx
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.core.config import settings

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

def call_ml_microservice(image_bytes: bytes) -> dict:
    """
    Calls the internal ML microservice using the bound ML_SERVICE_URL (Vercel Service Binding).
    """
    ml_url = os.environ.get("ML_SERVICE_URL") or settings.ML_SERVICE_URL
    if not ml_url:
        raise ValueError("ML_SERVICE_URL is not configured.")

    endpoint = f"{ml_url.rstrip('/')}/api/v1/predict/disease"
    with httpx.Client(timeout=30.0) as client:
        files = {"file": ("plant_scan.jpg", image_bytes, "image/jpeg")}
        resp = client.post(endpoint, files=files)
        resp.raise_for_status()
        return resp.json()

def predict_image(image_bytes: bytes, language: str = "en") -> dict:
    # 1. Try Gemini AI if API key and library are present
    if settings.GEMINI_API_KEY and genai:
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            lang_map = {"en": "English", "hi": "Hindi", "kn": "Kannada"}
            target_lang = lang_map.get(language[:2].lower(), "English")
            
            with open("app/prompts/dr_agri_prompt.txt", "r") as f:
                base_prompt = f.read()

            prompt = f"{base_prompt}\n\nIMPORTANT LOCALE OVERRIDE: You must output ALL strings and text values natively in the {target_lang} language! (Keep JSON keys in English, but translate the values)."
            
            response = client.models.generate_content(
                model='gemini-3.5-flash-lite',
                contents=[
                    prompt,
                    types.Part.from_bytes(data=image_bytes, mime_type='image/jpeg'),
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            raw_text = response.text
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            return json.loads(raw_text.strip())
        except Exception as e:
            print(f"Gemini API Error: {e}, attempting ML microservice fallback...")

    # 2. Try the internal ML microservice via bound service URL
    ml_url = os.environ.get("ML_SERVICE_URL") or settings.ML_SERVICE_URL
    if ml_url:
        try:
            return call_ml_microservice(image_bytes)
        except Exception as e:
            print(f"Internal ML microservice error: {e}")
            raise ValueError(f"Failed to analyze image via ML microservice: {e}")

    raise ValueError("Neither Gemini API Key nor ML_SERVICE_URL is configured or reachable.")
