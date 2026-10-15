from fastapi import APIRouter, Query, Depends
from pydantic import BaseModel
from typing import List
import json

from app.core.config import settings

try:
    from google import genai
except ImportError:
    genai = None

router = APIRouter()

class SearchSuggestion(BaseModel):
    type: str  # 'nav', 'info', 'action'
    label: str
    url: str

class SearchResponse(BaseModel):
    suggestions: List[SearchSuggestion]

@router.get("/", response_model=SearchResponse)
async def ai_global_search(q: str = Query(..., min_length=1)):
    """
    AI Global Search Bar endpoint.
    Takes a query and uses Gemini to suggest navigation or provide quick info.
    """
    api_key = settings.GEMINI_API_KEY
    if api_key and genai:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""You are the Dr Agri AI search suggestion engine.
The user typed: "{q}"

Suggest 3 to 4 relevant actions, navigation links, or quick info snippets.
Available URLs in the system:
/dashboard (Overview)
/scan (Disease Scan)
/finance (Finance)
/farm (Farm Manager)
/crops (Crop Manager)
/calendar (Crop Calendar)
/prices (Commodity Prices)
/drones (Drone Recovery)
/agronomy (Agronomy)
/marketplace (Marketplace)
/iot (IoT Sensors)
/b2b (Enterprise B2B)
/settings (Settings)

Respond ONLY with a valid JSON object matching this schema, no markdown blocks, no extra text:
{{
  "suggestions": [
    {{
      "type": "nav" or "info" or "action",
      "label": "Human readable suggestion label",
      "url": "Relevant URL from the list above, or '#' if it's just info"
    }}
  ]
}}
"""
            response = client.models.generate_content(
                model='gemini-3.5-flash-lite',
                contents=prompt,
            )
            # Clean up the response in case the LLM returned markdown code blocks
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            
            data = json.loads(text.strip())
            return data
        except Exception as e:
            print(f"Search AI Error: {e}")
            # Fallback below
            pass

    # Fallback offline logic
    q_lower = q.lower()
    suggestions = []
    
    if "farm" in q_lower or "plot" in q_lower:
        suggestions.append({"type": "nav", "label": "Manage Farm Plots", "url": "/farm"})
        suggestions.append({"type": "nav", "label": "View IoT Sensors", "url": "/iot"})
    if "crop" in q_lower or "tomato" in q_lower:
        suggestions.append({"type": "nav", "label": "Manage Crops", "url": "/crops"})
        suggestions.append({"type": "nav", "label": "Crop Calendar", "url": "/calendar"})
    if "disease" in q_lower or "scan" in q_lower:
        suggestions.append({"type": "action", "label": "Scan new leaf for disease", "url": "/scan"})
    if "money" in q_lower or "finance" in q_lower or "price" in q_lower:
        suggestions.append({"type": "nav", "label": "View Finance Dashboard", "url": "/finance"})
        suggestions.append({"type": "nav", "label": "Live Commodity Prices", "url": "/prices"})
    if "sell" in q_lower or "buy" in q_lower or "b2b" in q_lower:
        suggestions.append({"type": "nav", "label": "Enterprise B2B Contracts", "url": "/b2b"})
        suggestions.append({"type": "nav", "label": "Marketplace", "url": "/marketplace"})
        
    if not suggestions:
        suggestions.append({"type": "info", "label": f"Search agronomy for '{q}'", "url": "/agronomy"})
        suggestions.append({"type": "nav", "label": "Go to Dashboard", "url": "/dashboard"})
        
    return {"suggestions": suggestions}
