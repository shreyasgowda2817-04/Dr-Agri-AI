from fastapi import APIRouter, Depends
from pydantic import BaseModel
import random
import os
import logging
from typing import Optional, Dict, Any

from app.core.database import get_mongo_db
from app.api.dependencies import get_optional_current_user
from app.models.user import UserResponse
from app.api.routes.weather import get_weather_for_user_internal
from app.services.agronomy_knowledge import build_agronomy_expert_response

logger = logging.getLogger("dr_agri.chat")

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    language: str = "en-US" # en-US, hi-IN, kn-IN

class ChatResponse(BaseModel):
    reply: str
    source: Optional[str] = "gemini"
    model_used: Optional[str] = None
    warning: Optional[str] = None

@router.get("/status")
async def get_chat_ai_status():
    """
    Returns runtime health status of Gemini API and Agronomy Fallback engine.
    """
    from app.core.config import settings
    from app.services.gemini_service import model_health_tracker

    has_key = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip())
    summary = model_health_tracker.get_diagnostics()

    return {
        "gemini_api_configured": has_key,
        "primary_model": settings.GEMINI_PRIMARY_MODEL,
        "fallback_models": settings.get_gemini_model_chain(),
        "global_auth_failed": summary.get("globalAuthFailed", False),
        "total_fallback_events": summary.get("totalFallbackEvents", 0),
        "models_health": summary.get("models", {}),
        "offline_agronomy_engine_ready": True
    }

@router.post("/message", response_model=ChatResponse)
async def chat_with_agri_bot(
    request: ChatRequest,
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    db = Depends(get_mongo_db)
):
    """
    Production-ready AI Agronomy Chatbot & Assistant:
    1. Context-enriched query with user crops, farm plots, and live microclimate.
    2. Primary execution via Gemini API with automatic quota-aware multi-model fallback.
    3. Resilient autonomous Agronomy Knowledge Engine fallback if Gemini API key is leaked,
       invalid, rate-limited, or unavailable.
    """
    msg = request.message
    lang = request.language

    from app.core.config import settings

    # 1. Context gathering
    context_str = ""
    weather_dict = None

    if current_user:
        context_str += f"Farmer Name: {current_user.name}. Location: {current_user.location or 'Unknown'}.\n"
        
        # Fetch farms
        try:
            farms = await db["farm_plots"].find({"user_id": str(current_user.id)}).to_list(100)
            if farms:
                context_str += "Farms Owned:\n"
                for f in farms:
                    context_str += f"- {f.get('name')} ({f.get('area_acres')} acres, {f.get('soil_type')} soil)\n"
        except Exception:
            pass
            
        # Fetch crops
        try:
            crops = await db["crops"].find({"user_id": str(current_user.id)}).to_list(100)
            if crops:
                context_str += "Currently Growing Crops:\n"
                for c in crops:
                    context_str += f"- {c.get('crop_name')} (Variety: {c.get('variety')}, Stage: {c.get('crop_stage')}, {c.get('area_acres')} acres)\n"
        except Exception:
            pass
            
        # Fetch weather
        try:
            weather = await get_weather_for_user_internal(current_user, db)
            if weather:
                weather_dict = {
                    "temperature": weather.temperature,
                    "humidity": weather.humidity,
                    "rain_probability": weather.rain_probability,
                    "condition": weather.weather_condition
                }
                context_str += f"\nReal-Time Weather Information for Farm:\n"
                context_str += f"- Temperature: {weather.temperature}°C (Feels like {weather.feels_like}°C)\n"
                context_str += f"- Humidity: {weather.humidity}%\n"
                context_str += f"- Rainfall: {weather.rainfall}mm/hr\n"
                context_str += f"- Wind Speed: {weather.wind_speed} m/s\n"
                context_str += f"- Rain Probability: {weather.rain_probability}%\n"
                context_str += f"- Condition: {weather.weather_condition}\n"
                context_str += f"- Forecast: {weather.forecast}\n"
            else:
                context_str += "\nReal-Time Weather: Temporarily unavailable.\n"
        except Exception:
            pass
    else:
        context_str += "User is an anonymous visitor to the platform."

    # 2. Attempt to use Gemini via Multi-Model Fallback Service
    if settings.GEMINI_API_KEY:
        try:
            prompt = f"""You are Dr Agri AI, an elite, highly intelligent Agronomist AI Assistant.
You specialize in crop disease detection, fertilizer recommendations, yield optimization, and farming economics.

CONTEXT ABOUT THE USER:
{context_str}

USER QUERY:
'{msg}'

INSTRUCTIONS:
1. Respond in the requested language code: '{lang}'.

IMPORTANT RESPONSE STYLE:
Do NOT generate long report-style answers unless the user explicitly asks for a detailed explanation.

Your normal responses must be:
* Short, Conversational, Easy for farmers to understand, Action-oriented, Visually scannable.
* Specific to the farmer's crop, farm, soil, growth stage, and available weather data.

RESPONSE STRUCTURE:
Start with the direct answer in 1-2 sentences.
Then provide only the most important recommendations using short bullet points.
Use this structure when appropriate:

🌱 **Quick Recommendation**
[1-2 sentence answer]

**What to do now**
• Action 1
• Action 2

**Watch for**
• Important warning/sign

**Next step**
[One concise recommendation]

LENGTH RULES:
* Normal question: 60-120 words (max ~150).
* Simple question: 20-60 words.

AVOID REPETITION:
Do not repeat information that the user already knows unless it materially affects the recommendation.

The goal is to make every response feel like a helpful conversation with an agricultural expert sitting beside the farmer — concise, practical, and easy to act on.
"""
            from app.services.gemini_service import gemini_fallback_service
            reply_text, model_used = gemini_fallback_service.generate_text(
                prompt=prompt,
                response_mime_type="text/plain",
                feature_name="chat"
            )
            if reply_text and isinstance(reply_text, str) and reply_text.strip():
                return ChatResponse(
                    reply=reply_text.strip(),
                    source="gemini",
                    model_used=model_used
                )
        except Exception as e:
            logger.warning(
                f"[ChatService] Gemini API call unavailable ({e}). "
                f"Falling back to high-reliability Agronomy Knowledge Engine."
            )

    # 3. Resilient Agronomy Knowledge Engine Fallback
    # Fires seamlessly if Gemini key is invalid, leaked, rate-limited, or unavailable
    fallback_reply = build_agronomy_expert_response(
        query=msg,
        language=lang,
        user_context=context_str,
        weather_info=weather_dict
    )

    return ChatResponse(
        reply=fallback_reply,
        source="agronomy_knowledge_engine",
        model_used="local_agronomy_expert_v2",
        warning="AI Cloud connection busy; delivered via verified local agronomic intelligence."
    )
