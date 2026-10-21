from fastapi import APIRouter, Depends
from pydantic import BaseModel
import random
import os
import logging
from typing import Optional, Dict, Any, List

from app.core.database import get_mongo_db
from app.api.dependencies import get_optional_current_user
from app.models.user import UserResponse
from app.api.routes.weather import get_weather_for_user_internal
from app.services.agronomy_knowledge import build_agronomy_expert_response

logger = logging.getLogger("dr_agri.chat")

router = APIRouter()

class ChatMessage(BaseModel):
    role: str # "user" or "model" / "assistant" / "ai"
    content: str

class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en-US" # en-US, hi-IN, kn-IN
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    reply: str
    source: Optional[str] = "gemini"
    model_used: Optional[str] = None
    warning: Optional[str] = None

AGRONOMIST_SYSTEM_INSTRUCTION = """You are Dr Agri AI, an elite, friendly, and highly knowledgeable Agronomist AI Assistant.
You serve farmers, agronomists, and agricultural students with clear, scientifically grounded agricultural intelligence.

INTENT-AWARE GUIDELINES:

1. GENERAL AGRICULTURAL EDUCATION & DEFINITIONS:
   - When the user asks a conceptual, educational, or general question (e.g., "what is crops", "what is photosynthesis", "what is agriculture", "what is drip irrigation", "explain crop rotation", "what is kharif"):
   - Give a direct, clear, educational answer explaining the concept simply and accurately.
   - Do NOT ask for crop details or force an action checklist for purely educational definitions. Conclude with an open, friendly offer to help if they are growing a specific crop.

2. FERTILIZER & NUTRIENT RECOMMENDATIONS:
   - If the user asks for fertilizer recommendations (e.g., "What fertilizer is best for my crops?") WITHOUT specifying a crop (and no crop is present in the conversation history or user profile):
   - DO NOT prescribe a blanket or arbitrary chemical/fertilizer (never default to NPK 19:19:19 or DAP without knowing the crop).
   - Explain politely that fertilizer requirements depend directly on the specific crop, growth stage (vegetative vs. flowering/fruiting), and soil conditions.
   - Ask the farmer to specify their crop and current growth stage so you can provide an exact dosage and schedule.

3. CROP CULTIVATION & FIELD MANAGEMENT:
   - When a specific crop is known (e.g., Wheat, Rice, Tomato):
   - Provide concrete, actionable advice: basal fertilizers, top dressing, spacing, seed rate, irrigation intervals, and critical stages.

4. CROP DISEASE & PEST DIAGNOSTICS:
   - When symptoms are described:
   - Identify potential pathogens (fungal, bacterial, viral, or pest damage) with realistic confidence.
   - Provide integrated pest management (IPM): cultural practices, organic biological options (e.g., Neem oil, Trichoderma), and verified chemical controls with standard dosage (e.g. g/L or ml/L).
   - Include safety warnings (PPE, spray timing, rainfastness, pre-harvest interval).
   - Suggest uploading a clear leaf photo to the 'Crop Scan' feature for automated computer vision pathology.

5. MICROCLIMATE & REAL-TIME WEATHER:
   - If real-time weather information is provided in the context, utilize it to give weather-aware spray and irrigation recommendations (e.g., high humidity triggers fungal advisory, avoid spraying before rain or in high winds).
   - If weather data is not available, provide general meteorological guidelines. Never hallucinate fake live weather.

6. CASUAL CHAT & GREETINGS:
   - Respond warmly and courteously as Dr Agri AI. Keep introductory greetings concise and ready to assist.

7. LANGUAGE & STYLE:
   - Respond in the requested language ({lang}) or the language used by the user.
   - Formatting: Use clean markdown, bold headers, and concise bullet points. Avoid overwhelming blocks of text.
"""

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
            from google.genai import types

            contents = []
            if request.history:
                recent_history = request.history[-8:]
                for h in recent_history:
                    role = "user" if h.role.lower() in ("user", "human") else "model"
                    if h.content and h.content.strip():
                        contents.append(
                            types.Content(
                                role=role,
                                parts=[types.Part.from_text(text=h.content.strip())]
                            )
                        )

            # Format current user query with context if available
            current_prompt = f"CONTEXT ABOUT THE USER & FARM:\n{context_str}\n\nUSER QUERY:\n{msg}" if context_str else msg
            contents.append(
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=current_prompt)]
                )
            )

            from app.services.gemini_service import gemini_fallback_service
            reply_text, model_used = gemini_fallback_service.generate_text(
                prompt=contents,
                response_mime_type="text/plain",
                feature_name="chat",
                system_instruction=AGRONOMIST_SYSTEM_INSTRUCTION.format(lang=lang)
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
    fallback_history = [
        {"role": h.role, "content": h.content}
        for h in (request.history or [])
    ]
    fallback_reply = build_agronomy_expert_response(
        query=msg,
        language=lang,
        user_context=context_str,
        weather_info=weather_dict,
        history=fallback_history
    )

    return ChatResponse(
        reply=fallback_reply,
        source="agronomy_knowledge_engine",
        model_used="local_agronomy_expert_v2",
        warning="AI Cloud connection busy; delivered via verified local agronomic intelligence."
    )
