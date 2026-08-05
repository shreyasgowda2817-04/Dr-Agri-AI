from fastapi import APIRouter, Depends
from pydantic import BaseModel
import random
import os
from typing import Optional

from app.core.database import get_mongo_db
from app.api.dependencies import get_optional_current_user
from app.models.user import UserResponse

try:
    from google import genai
    import google.genai.errors
except ImportError:
    genai = None

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    language: str = "en-US" # en-US, hi-IN, kn-IN

class ChatResponse(BaseModel):
    reply: str

@router.post("/message", response_model=ChatResponse)
async def chat_with_agri_bot(
    request: ChatRequest,
    current_user: Optional[UserResponse] = Depends(get_optional_current_user),
    db = Depends(get_mongo_db)
):
    """
    Powerful Real LLM Engine using Google Gemini with Context Injection.
    """
    msg = request.message
    lang = request.language

    from app.core.config import settings

    # Context gathering
    context_str = ""
    if current_user:
        context_str += f"Farmer Name: {current_user.name}. Location: {current_user.location or 'Unknown'}.\n"
        
        # Fetch farms
        farms = await db["farm_plots"].find({"user_id": str(current_user.id)}).to_list(100)
        if farms:
            context_str += "Farms Owned:\n"
            for f in farms:
                context_str += f"- {f.get('name')} ({f.get('area_acres')} acres, {f.get('soil_type')} soil)\n"
                
        # Fetch crops
        crops = await db["crops"].find({"user_id": str(current_user.id)}).to_list(100)
        if crops:
            context_str += "Currently Growing Crops:\n"
            for c in crops:
                context_str += f"- {c.get('crop_name')} (Variety: {c.get('variety')}, Stage: {c.get('crop_stage')}, {c.get('area_acres')} acres)\n"
    else:
        context_str += "User is an anonymous visitor to the platform."

    # Attempt to use Gemini if API key is present
    api_key = settings.GEMINI_API_KEY
    if api_key and genai:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""You are Dr Agri AI, an elite, highly intelligent Agronomist AI Assistant.
You specialize in crop disease detection, fertilizer recommendations, yield optimization, and farming economics.

CONTEXT ABOUT THE USER:
{context_str}

USER QUERY:
'{msg}'

INSTRUCTIONS:
1. Respond in the requested language code: '{lang}'.
2. If the user has crops/farms listed in the context, personalize your advice directly to their situation (e.g. mention their specific soil type or crop stage).
3. Provide actionable, scientifically sound agricultural advice.
4. Keep your response concise (under 4 paragraphs), professional, warm, and highly helpful. Do not use markdown that would break simple chat UIs, stick to plain text or simple bullets.
"""
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
            )
            return ChatResponse(reply=response.text)
        except Exception as e:
            print(f"Gemini API Error: {e}, falling back to mock rules.")

    # Fallback mock logic
    msg_lower = msg.lower()
    if "tomato" in msg_lower or "blight" in msg_lower or "टमाटर" in msg_lower or "ಟೊಮೆಟೊ" in msg_lower:
        if "hi-IN" in lang:
            reply = "टमाटर के झुलसा रोग (Early Blight) के लिए, कृपया कॉपर आधारित कवकनाशी (Fungicide) का छिड़काव करें। पौधों के बीच हवा का प्रवाह सुनिश्चित करें।"
        elif "kn-IN" in lang:
            reply = "ಟೊಮೆಟೊ ರೋಗಕ್ಕಾಗಿ, ದಯವಿಟ್ಟು ತಾಮ್ರ ಆಧಾರಿತ ಶಿಲೀಂಧ್ರನಾಶಕವನ್ನು ಸಿಂಪಡಿಸಿ. ಸಸ್ಯಗಳ ನಡುವೆ ಸರಿಯಾದ ಗಾಳಿಯ ಹರಿವನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ."
        else:
            reply = "For Tomato Early Blight, please spray a copper-based fungicide and ensure proper spacing between plants for air circulation."
            
    elif "fertilizer" in msg_lower or "ಉರಗ" in msg_lower or "उर्वरक" in msg_lower or "खाद" in msg_lower:
        if "hi-IN" in lang:
            reply = "हम यूरिया या NPK 19:19:19 उर्वरक का उपयोग करने की सलाह देते हैं। क्या आप जानना चाहते हैं कि इसे कैसे मिलाया जाए?"
        elif "kn-IN" in lang:
            reply = "ನಾವು ಯೂರಿಯಾ ಅಥವಾ NPK 19:19:19 ರಸಗೊಬ್ಬರವನ್ನು ಬಳಸಲು ಶಿಫಾರಸು ಮಾಡುತ್ತೇವೆ."
        else:
            reply = "I recommend using NPK 19:19:19 fertilizer. Make sure to water the soil before application."
            
    elif "weather" in msg_lower or "ಹವಾಮಾನ" in msg_lower or "मौसम" in msg_lower:
        if "hi-IN" in lang:
            reply = "आज बारिश की संभावना है। कृपया आज कीटनाशकों का छिड़काव न करें।"
        elif "kn-IN" in lang:
            reply = "ಇಂದು ಮಳೆಯಾಗುವ ಸಾಧ್ಯತೆ ಇದೆ. ದಯವಿಟ್ಟು ಇಂದು ಕೀಟನಾಶಕಗಳನ್ನು ಸಿಂಪಡಿಸಬೇಡಿ."
        else:
            reply = "There is a high chance of rain today. It is advisable to delay any pesticide spraying."
            
    else:
        # Fallback generic response
        if "hi-IN" in lang:
            reply = "मैं एक कृषि एआई सहायक हूँ। कृपया अपनी फसल की बीमारी या उर्वरक के बारे में पूछें।"
        elif "kn-IN" in lang:
            reply = "ನಾನು ಕೃಷಿ ಎಐ ಸಹಾಯಕ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಬೆಳೆ ರೋಗ ಅಥವಾ ರಸಗೊಬ್ಬರದ ಬಗ್ಗೆ ಕೇಳಿ."
        else:
            responses = [
                "I am your AI Agriculture Expert. How can I help you with your crops today?",
                "Could you provide more details about the crop you are growing?",
                "I specialize in disease detection and farm economics. What is your question?"
            ]
            reply = random.choice(responses)
            
    return ChatResponse(reply=reply)
