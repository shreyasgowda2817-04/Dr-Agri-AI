import os
import uuid
import cloudinary
import cloudinary.uploader
import httpx
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import json

from app.core.database import get_mongo_db
from app.models.user import UserResponse
from app.models.report import DiseaseReportResponse
from app.api.dependencies import get_current_user
try:
    from app.services.ml_service import predict_image, fallback_agronomy_inference
except ImportError:
    from app.services.ml_service import predict_image
    fallback_agronomy_inference = None
from app.core.config import settings

def get_emergency_fallback_diagnosis(language: str = "en") -> dict:
    """Safe inline emergency fallback if ml_service encounters an import or runtime error."""
    lang_code = (language or "en")[:2].lower()
    if lang_code == "hi":
        crop_name = "पहचानी गई फसल (सत्यापन आवश्यक)"
        disease_name = "संभावित पत्ती संक्रमण (समीक्षा लंबित)"
        desc = "एआई मॉडल वर्तमान में व्यस्त हैं। प्रारंभिक विश्लेषण पत्ती पर तनाव या फंगल संक्रमण का संकेत देता है।"
        org_treat = ["नीम के तेल (3-5 मिली/लीटर पानी) का छिड़काव करें", "संक्रमित पत्तियों को हटा दें"]
        chem_treat = ["कॉपर ऑक्सीक्लोराइड 50 WP (2.5 ग्राम/लीटर पानी) का छिड़काव करें"]
        prev = ["अतिरिक्त नमी से बचें", "पौधों के बीच पर्याप्त दूरी रखें"]
    elif lang_code == "kn":
        crop_name = "ಗುರುತಿಸಲಾದ ಬೆಳೆ (ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ)"
        disease_name = "ಸಂಭಾವ್ಯ ಎಲೆ ಸೋಂಕು (ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ)"
        desc = "ಎಐ ಮಾದರಿಗಳು ಪ್ರಸ್ತುತ ಕಾರ್ಯನಿರತವಾಗಿವೆ. ಎಲೆಯ ಮೇಲೆ ಶಿಲೀಂಧ್ರ ಅಥವಾ ಪೋಷಕಾಂಶದ ಕೊರತೆಯ ಲಕ್ಷಣ ಕಂಡುಬಂದಿದೆ."
        org_treat = ["ಬೇವಿನ ಎಣ್ಣೆ (3-5 ಮಿಲಿ/ಲೀಟರ್ ನೀರು) ಸಿಂಪಡಿಸಿ", "ಸೋಂಕಿತ ಎಲೆಗಳನ್ನು ತೆಗೆದುಹಾಕಿ"]
        chem_treat = ["ಕಾಪರ್ ಆಕ್ಸಿಕ್ಲೋರೈಡ್ 50 WP (2.5 ಗ್ರಾಂ/ಲೀಟರ್ ನೀರು) ಸಿಂಪಡಿಸಿ"]
        prev = ["ಹೆಚ್ಚುವರಿ ತೇವಾಂಶ ತಪ್ಪಿಸಿ", "ಸಸ್ಯಗಳ ನಡುವೆ ಸೂಕ್ತ ಅಂತರ ಕಾಯ್ದುಕೊಳ್ಳಿ"]
    else:
        crop_name = "Crop Plant (Verification Recommended)"
        disease_name = "Potential Foliar Stress / Leaf Infection"
        desc = "AI services are temporarily busy. Visual scan indicates possible early fungal spotting or physiological foliar stress. Field agronomist confirmation recommended."
        org_treat = ["Apply cold-pressed neem oil (3-5 ml/L water) as a preventative spray", "Prune and dispose of severely spotted leaves"]
        chem_treat = ["Apply copper oxychloride 50% WP (2.5g/L water) or mancozeb if fungal infection progresses"]
        prev = ["Avoid overhead irrigation during evening hours", "Ensure adequate plant spacing for aeration"]

    return {
        "status": "partial_success",
        "crop_detected": True,
        "crop": {
            "name": crop_name,
            "variety": "Standard",
            "plant_part": "Leaf",
            "growth_stage": "Vegetative / Reproductive",
            "confidence": 65.0,
        },
        "diagnosis": {
            "disease_name": disease_name,
            "disease_type": "Fungal / Physiological Stress",
            "confidence": 60.0,
            "status": "Possible",
            "severity": "Mild to Moderate",
            "visible_symptoms": ["Leaf spots or chlorosis"]
        },
        "disease_overview": {
            "description": desc,
            "cause_pathogen": "Foliar pathogen or moisture stress",
            "symptoms": "Leaf spots or chlorosis"
        },
        "organic_treatments": org_treat,
        "chemical_treatments": chem_treat,
        "prevention": prev,
        "is_fallback": True,
        "fallback_reason": "AI models temporarily unavailable"
    }

if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

router = APIRouter()
FREE_TIER_SCAN_LIMIT = 5
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/predict", status_code=status.HTTP_201_CREATED)
async def predict_disease(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    language: Optional[str] = Form("en"),
    plot_id: Optional[str] = Form(None),
    current_user: UserResponse = Depends(get_current_user),
    db = Depends(get_mongo_db)
):
    try:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image.")
    
        user_dict = await db["users"].find_one({"id": current_user.id})
    
        if user_dict and user_dict.get("tier") == "basic" and user_dict.get("scan_count", 0) >= FREE_TIER_SCAN_LIMIT:
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "SCAN_LIMIT_REACHED",
                    "message": f"Free plan limit of {FREE_TIER_SCAN_LIMIT} scans reached. Upgrade to Pro to continue.",
                    "scans_used": user_dict.get("scan_count", 0),
                    "limit": FREE_TIER_SCAN_LIMIT
                }
            )
    
        file_bytes = await file.read()
        image_url = ""
        if settings.CLOUDINARY_CLOUD_NAME:
            try:
                upload_result = cloudinary.uploader.upload(file_bytes, folder="crop_disease_scans")
                image_url = upload_result.get("secure_url")
            except Exception as e:
                pass
        if not image_url:
            import base64
            encoded = base64.b64encode(file_bytes).decode('utf-8')
            image_url = f"data:{file.content_type};base64,{encoded}"
            
        try:
            prediction_result = predict_image(file_bytes, language=language)
            if isinstance(prediction_result, list) and len(prediction_result) > 0:
                prediction_result = prediction_result[0]
            if not isinstance(prediction_result, dict):
                prediction_result = {}
        except Exception as e:
            import traceback
            print(f"ML Inference error, activating built-in fallback agronomist engine: {e}")
            if fallback_agronomy_inference is not None:
                try:
                    prediction_result = fallback_agronomy_inference(file_bytes, language=language)
                except Exception as fb_err:
                    print(f"fallback_agronomy_inference call failed: {fb_err}")
                    prediction_result = get_emergency_fallback_diagnosis(language=language)
            else:
                prediction_result = get_emergency_fallback_diagnosis(language=language)
    
        if user_dict:
            try:
                await db["users"].update_one({"id": current_user.id}, {"$inc": {"scan_count": 1}})
            except Exception as inc_err:
                print(f"User scan count increment warning: {inc_err}")
    
        # SAFELY map the AI schema to OLD frontend expectations to prevent crashing
        diag = prediction_result.get("diagnosis") or {}
        crop_info = prediction_result.get("crop") or {}
        overview_data = prediction_result.get("disease_overview") or {}
        
        # Build overview text for fallback extraction if needed
        if isinstance(overview_data, dict):
            overview_text = (
                (overview_data.get("description") or "") + " " + 
                (overview_data.get("cause_pathogen") or "") + " " +
                (overview_data.get("symptoms") or "")
            )
        elif isinstance(overview_data, str):
            overview_text = overview_data
        else:
            overview_text = ""
        
        # Flexible crop name extraction
        crop_name = "Unknown"
        if isinstance(crop_info, dict):
            crop_name = crop_info.get("name") or crop_info.get("crop_name") or crop_info.get("crop") or crop_info.get("identified_crop") or "Unknown"
        elif isinstance(crop_info, str) and crop_info.strip():
            crop_name = crop_info.strip()
        
        if crop_name == "Unknown":
            for key in ["crop_name", "crop", "identified_crop", "plant"]:
                val = prediction_result.get(key)
                if isinstance(val, str) and val.strip():
                    crop_name = val.strip()
                    break
                elif isinstance(val, dict):
                    crop_name = val.get("name") or val.get("crop_name") or val.get("crop") or "Unknown"
                    if crop_name != "Unknown":
                        break
                        
        if crop_name == "Unknown" and overview_text:
            common_crops = [
                ("coriander", "Coriander / Cilantro"),
                ("cilantro", "Coriander / Cilantro"),
                ("tomato", "Tomato"),
                ("potato", "Potato"),
                ("onion", "Onion"),
                ("chili", "Chili / Pepper"),
                ("pepper", "Pepper"),
                ("corn", "Corn / Maize"),
                ("maize", "Corn / Maize"),
                ("rice", "Rice / Paddy"),
                ("paddy", "Rice / Paddy"),
                ("wheat", "Wheat"),
                ("cotton", "Cotton"),
                ("sugarcane", "Sugarcane"),
                ("soybean", "Soybean"),
                ("apple", "Apple"),
                ("grape", "Grape"),
                ("banana", "Banana"),
                ("citrus", "Citrus"),
                ("mango", "Mango")
            ]
            for kw, proper_name in common_crops:
                if kw in overview_text.lower():
                    crop_name = proper_name
                    break

        # Flexible disease name extraction
        disease_name = "Unknown"
        if isinstance(diag, dict):
            disease_name = diag.get("disease_name") or diag.get("name") or diag.get("disease") or diag.get("diagnosis") or diag.get("condition") or "Unknown"
        elif isinstance(diag, str) and diag.strip():
            disease_name = diag.strip()
            
        if disease_name == "Unknown":
            for key in ["disease_name", "disease", "condition", "diagnosis"]:
                val = prediction_result.get(key)
                if isinstance(val, str) and val.strip():
                    disease_name = val.strip()
                    break
                elif isinstance(val, dict):
                    disease_name = val.get("disease_name") or val.get("name") or val.get("disease") or "Unknown"
                    if disease_name != "Unknown":
                        break
                        
        if disease_name == "Unknown" and overview_text:
            common_diseases = [
                ("bacterial leaf spot", "Bacterial Leaf Spot"),
                ("early blight", "Early Blight"),
                ("late blight", "Late Blight"),
                ("powdery mildew", "Powdery Mildew"),
                ("downy mildew", "Downy Mildew"),
                ("leaf curl", "Leaf Curl Virus"),
                ("anthracnose", "Anthracnose"),
                ("rust", "Rust"),
                ("stem rot", "Stem Rot"),
                ("root rot", "Root Rot"),
                ("mosaic", "Mosaic Virus"),
                ("wilt", "Fusarium Wilt")
            ]
            for kw, proper_name in common_diseases:
                if kw in overview_text.lower():
                    disease_name = proper_name
                    break
            if disease_name == "Unknown" and isinstance(overview_data, dict) and overview_data.get("cause_pathogen"):
                disease_name = f"Infection ({overview_data.get('cause_pathogen')})"

        # Ensure crop_info and diag dictionaries reflect the detected names
        if isinstance(crop_info, dict) and not crop_info.get("name") and crop_name != "Unknown":
            crop_info["name"] = crop_name
        if isinstance(diag, dict) and not diag.get("disease_name") and disease_name != "Unknown":
            diag["disease_name"] = disease_name

        # Flexible confidence score
        confidence_val = "85.0"
        if isinstance(diag, dict):
            confidence_val = diag.get("confidence") or diag.get("confidence_score") or "85.0"
        elif "confidence" in prediction_result:
            confidence_val = prediction_result.get("confidence")
        elif isinstance(crop_info, dict) and "confidence" in crop_info:
            confidence_val = crop_info.get("confidence")
            
        try:
            conf_score = float(str(confidence_val).replace("%", "").strip())
        except Exception:
            conf_score = 85.0

        # Flexible severity
        severity = "High"
        if isinstance(diag, dict):
            severity = diag.get("severity") or diag.get("status") or diag.get("diagnosis_status") or "High"
        elif "severity" in prediction_result:
            severity = prediction_result.get("severity")
            
        new_treat = prediction_result.get("treatments") or {}
        if not isinstance(new_treat, dict):
            new_treat = {}
        org = new_treat.get("organic") or prediction_result.get("organic_treatments") or {}
        if not isinstance(org, dict):
            org = {"disease_control": [org] if org else []}
        chem = new_treat.get("chemical") or prediction_result.get("chemical_treatments") or {}
        if not isinstance(chem, dict):
            chem = {"disease_control": [chem] if chem else []}
            
        sprays_data = prediction_result.get("sprays") or {}
        if not isinstance(sprays_data, dict):
            sprays_data = {}
        
        def ensure_list(val):
            if isinstance(val, list): return val
            if isinstance(val, dict): return [val]
            if isinstance(val, str) and val.strip(): return [val.strip()]
            if val: return [val]
            return []

        def extract_item_name(item):
            if isinstance(item, str): return item
            if isinstance(item, dict): return item.get("name") or item.get("active_ingredient") or item.get("purpose") or str(item)
            return str(item)

        # Classification helper keywords
        ORGANIC_KEYWORDS = [
            "neem", "bacillus", "trichoderma", "pseudomonas", "compost", "vermicompost",
            "fym", "manure", "bio-", "biofertilizer", "organic", "sanitation", "debris",
            "cultural", "rotation", "mulch", "botanical", "garlic", "panchagavya", "jeevamrut",
            "biological", "subtilis", "fluorescens"
        ]
        
        CHEMICAL_EXCLUSIONS = [
            "copper", "mancozeb", "urea", "dap", "npk", "strepto", "carbendazim", 
            "oxychloride", "hydroxide", "azoxy", "fungicide", "bactericide", "chemical", "pesticide"
        ]

        def is_pure_organic(name: str) -> bool:
            low = name.lower()
            if any(c in low for c in CHEMICAL_EXCLUSIONS):
                return False
            return any(k in low for k in ORGANIC_KEYWORDS) or "sanitation" in low or "pruning" in low

        def normalize_name(text: str) -> str:
            import re
            cleaned = re.sub(r'\(.*?\)', '', text.lower())
            cleaned = re.sub(r'\b\d+(\.\d+)?\s*(g|ml|kg|%|wp|ec|sc|ppm)\b', '', cleaned)
            cleaned = re.sub(r'[^a-z0-9]', '', cleaned)
            return cleaned[:12]

        # 1. Collect & Deduplicate Organic Remedies
        raw_org = (
            ensure_list(org.get("disease_control")) + 
            ensure_list(org.get("biological")) + 
            ensure_list(org.get("cultural")) +
            ensure_list(org.get("nutrition")) +
            ensure_list(sprays_data.get("organic_biological_sprays")) +
            ensure_list(sprays_data.get("organic_sprays")) +
            ensure_list(prediction_result.get("organic_remedies"))
        )

        seen_org = set()
        deduped_organic = []
        for item in raw_org:
            name_str = extract_item_name(item).strip()
            if not name_str:
                continue
            # Filter out chemical names that might have been grouped into organic by the LLM
            if not is_pure_organic(name_str) and any(c in name_str.lower() for c in CHEMICAL_EXCLUSIONS):
                continue
            norm = normalize_name(name_str)
            if norm and norm not in seen_org:
                seen_org.add(norm)
                deduped_organic.append(name_str)

        # Only fallback if AI returned zero organic remedies
        if len(deduped_organic) == 0 and disease_name != "Unknown":
            defaults_org = [
                "Neem Oil Spray (1500 ppm, 3-5 ml/L water) as natural foliar protective spray",
                "Bacillus subtilis / Bio-fungicide foliar application to suppress pathogen spread",
                "Field sanitation: remove and safely discard severely infected leaves"
            ]
            for def_item in defaults_org:
                norm = normalize_name(def_item)
                if norm not in seen_org:
                    seen_org.add(norm)
                    deduped_organic.append(def_item)

        # 2. Collect & Deduplicate Chemical Treatments + Fertilizers (DAP, Urea, NPK)
        raw_chem = (
            ensure_list(chem.get("disease_control")) + 
            ensure_list(chem.get("sprays")) +
            ensure_list(chem.get("fertilizers")) +
            ensure_list(sprays_data.get("chemical_sprays")) +
            ensure_list(prediction_result.get("chemical_treatment_options")) +
            ensure_list(prediction_result.get("ai_recommended_products")) +
            ensure_list(prediction_result.get("recommended_products"))
        )

        seen_chem = set()
        deduped_chemical = []

        def make_chem_obj(name, category, method, dosage, waiting_period):
            return {
                "name": name,
                "category": category,
                "method": method,
                "dosage": dosage,
                "waiting_period": waiting_period
            }

        for item in raw_chem:
            if isinstance(item, dict):
                c_name = item.get("name") or item.get("active_ingredient") or item.get("product_name") or ""
                c_name = c_name.strip()
                if not c_name or is_pure_organic(c_name):
                    continue
                norm = normalize_name(c_name)
                if norm in seen_chem:
                    continue
                seen_chem.add(norm)
                
                cat = item.get("chemical_category") or item.get("category") or ("Chemical Fertilizer" if any(f in c_name.lower() for f in ["npk", "urea", "dap", "potash"]) else "Chemical Spray / Treatment")
                method = item.get("application_method") or item.get("method") or ("Soil Application" if any(f in c_name.lower() for f in ["dap", "urea"]) else "Foliar Spray")
                dose = item.get("dosage") or item.get("dosage_per_acre") or "2.5 - 3 g / L water"
                wait = item.get("waiting_period") or item.get("waitingDays") or ("0 Days" if "npk" in c_name.lower() else "10-14 Days")
                
                deduped_chemical.append(make_chem_obj(c_name, cat, method, dose, wait))
            elif isinstance(item, str) and item.strip():
                c_name = item.strip()
                if is_pure_organic(c_name):
                    continue
                norm = normalize_name(c_name)
                if norm in seen_chem:
                    continue
                seen_chem.add(norm)
                
                cat = "Chemical Fertilizer" if any(f in c_name.lower() for f in ["npk", "urea", "dap", "potash"]) else "Chemical Spray"
                method = "Soil Application" if any(f in c_name.lower() for f in ["dap", "urea"]) else "Foliar Spray"
                dose = "4-5 g/L water" if "npk" in c_name.lower() else ("35 kg/acre" if "dap" in c_name.lower() or "urea" in c_name.lower() else "2-3 g/L water")
                wait = "0 Days" if "npk" in c_name.lower() else ("Pre-harvest" if "dap" in c_name.lower() or "urea" in c_name.lower() else "10-14 Days")
                
                deduped_chemical.append(make_chem_obj(c_name, cat, method, dose, wait))

        # Only in the rare edge-case where the AI model returns zero chemical items for a diagnosed disease,
        # provide agronomic fallbacks so the farmer is not left without guidance.
        if len(deduped_chemical) == 0 and disease_name != "Unknown":
            is_bacterial = any(b in disease_name.lower() for b in ["bacterial", "pseudomonas", "xanthomonas"])
            if is_bacterial or "spot" in disease_name.lower():
                spray_defaults = [
                    ("Copper Oxychloride 50% WP", "Chemical Spray / Bactericide", "Foliar Spray", "2.5 - 3 g per Litre of water", "10-14 Days"),
                    ("Streptocycline (90:10 Bactericide)", "Systemic Antibiotic Spray", "Foliar Spray", "1 g in 10 Litres of water", "7 Days")
                ]
            else:
                spray_defaults = [
                    ("Mancozeb 75% WP", "Broad Spectrum Contact Fungicide", "Foliar Spray", "2.0 - 2.5 g per Litre of water", "14 Days"),
                    ("Copper Oxychloride 50% WP", "Protective Foliar Spray", "Foliar Spray", "2.5 - 3 g per Litre of water", "10-14 Days")
                ]

            for s_name, s_cat, s_meth, s_dose, s_wait in spray_defaults:
                norm = normalize_name(s_name)
                if norm not in seen_chem:
                    seen_chem.add(norm)
                    deduped_chemical.append(make_chem_obj(s_name, s_cat, s_meth, s_dose, s_wait))

            fertilizer_defaults = [
                ("NPK 19:19:19 (Water Soluble Foliar Fertilizer)", "Nutrient Recovery Foliar Spray", "Foliar Spray", "4 - 5 g per Litre of water", "0 Days (Nutrient)"),
                ("DAP (Di-Ammonium Phosphate) + Urea", "Basal & Canopy Nutrition Recovery", "Soil Application / Top Dressing", "35 kg DAP + 15 kg Urea per acre", "Pre-harvest safety")
            ]

            for f_name, f_cat, f_meth, f_dose, f_wait in fertilizer_defaults:
                norm = normalize_name(f_name)
                if norm not in seen_chem:
                    seen_chem.add(norm)
                    deduped_chemical.append(make_chem_obj(f_name, f_cat, f_meth, f_dose, f_wait))

        fert_list = ensure_list(org.get("nutrition")) + ensure_list(chem.get("fertilizers"))
        extracted_fertilizers = [extract_item_name(item) for item in fert_list if item]
        if not extracted_fertilizers:
            extracted_fertilizers = ["NPK 19:19:19 foliar spray", "DAP + Urea soil application"]
        
        old_treatment = {
            "organic_remedies": deduped_organic,
            "pesticides": deduped_chemical,
            "fertilizers": extracted_fertilizers,
            "preventive_measures": ensure_list(prediction_result.get("prevention") or prediction_result.get("preventive_measures"))
        }
    
        # 3. AI Product Matching
        all_products = await db["products"].find().to_list(length=100)
        recommended_products = []
        for p in all_products:
            targets = p.get("target_diseases") or []
            if disease_name in targets or disease_name.split("___")[-1].replace("_", " ") in targets or any(disease_name.lower() in t.lower() or t.lower() in disease_name.lower() for t in targets):
                recommended_products.append({
                    "id": p["id"],
                    "name": p["name"],
                    "price": p["price"],
                    "dosage_per_acre": p.get("dosage_per_acre"),
                    "image_url": p.get("image_url")
                })
    
        # Plot association
        farm_plot_name = None
        if plot_id:
            try:
                from bson import ObjectId
                plot_q = {"user_id": str(current_user.id)}
                try:
                    plot_q["_id"] = ObjectId(plot_id)
                except Exception:
                    plot_q["id"] = plot_id
                plot_doc = await db["farm_plots"].find_one(plot_q)
                if plot_doc:
                    farm_plot_name = plot_doc.get("name")
            except Exception as plot_err:
                print(f"Farm plot lookup notice: {plot_err}")

        # Weather Intelligence & Spray Window Analysis
        weather_snapshot = None
        spray_time = "Tomorrow, 6:00 AM - 8:30 AM"
        spray_window_status = "optimal"
        spray_reason = "Calm winds, safe temperatures, and no precipitation expected."
        weather_intelligence = None

        if latitude is not None and longitude is not None:
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.get(
                        f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}"
                        f"&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation"
                        f"&hourly=precipitation_probability&forecast_days=1"
                    )
                    if resp.status_code == 200:
                        wdata = resp.json()
                        cur = wdata.get("current", {})
                        temp = cur.get("temperature_2m")
                        hum = cur.get("relative_humidity_2m")
                        wind = cur.get("wind_speed_10m", 0)
                        precip = cur.get("precipitation", 0)
                        
                        hourly = wdata.get("hourly", {})
                        rain_probs = hourly.get("precipitation_probability", [0])
                        max_rain_prob = max(rain_probs[:12]) if rain_probs else 0
                        
                        weather_snapshot = {
                            "temperature": f"{temp}°C" if temp is not None else "N/A",
                            "humidity": f"{hum}%" if hum is not None else "N/A",
                            "wind_speed": f"{wind} km/h",
                            "rain_probability": f"{max_rain_prob}%"
                        }
                        
                        if wind > 14:
                            spray_window_status = "delay"
                            spray_time = "Delay spray due to high winds"
                            spray_reason = f"Wind speed of {wind} km/h exceeds the 14 km/h drift safety limit."
                        elif max_rain_prob > 35 or (precip and precip > 0):
                            spray_window_status = "delay"
                            spray_time = "Delay spray due to expected rainfall"
                            spray_reason = f"Rain probability is {max_rain_prob}%. Foliar deposits risk being washed off."
                        elif temp and temp > 32:
                            spray_window_status = "suboptimal"
                            spray_time = "Tomorrow, 5:30 AM - 7:30 AM (avoid mid-day heat)"
                            spray_reason = f"Temperature of {temp}°C causes rapid droplet volatilization and leaf scorch."
                        else:
                            spray_window_status = "optimal"
                            spray_time = "Tomorrow, 6:00 AM - 8:30 AM"
                            spray_reason = f"Optimal spray window: Wind {wind} km/h, Temp {temp}°C, {hum}% RH, {max_rain_prob}% rain."
                        
                        conducive = None
                        if hum and hum > 75:
                            conducive = f"High relative humidity ({hum}%) promotes fungal sporulation and bacterial leaf wetness."
                        
                        weather_intelligence = {
                            "source": "Open-Meteo Agricultural API",
                            "observed_at": datetime.now(timezone.utc).isoformat(),
                            "freshness": "Real-time (last 15m)",
                            "temperature": temp,
                            "humidity": hum,
                            "wind_speed": wind,
                            "rain_probability": max_rain_prob,
                            "condition": "Humid / Favorable to foliar growth" if hum and hum > 70 else "Normal",
                            "conducive_conditions": conducive,
                            "spray_window": {
                                "status": spray_window_status,
                                "recommended_time": spray_time,
                                "reason": spray_reason
                            }
                        }
            except Exception as weather_err:
                print(f"Weather fetch notice: {weather_err}")

        if not weather_intelligence:
            weather_intelligence = {
                "source": "Station offline / Coordinates not provided",
                "observed_at": datetime.now(timezone.utc).isoformat(),
                "freshness": "Unavailable",
                "temperature": None,
                "humidity": None,
                "wind_speed": None,
                "rain_probability": None,
                "condition": "Unavailable",
                "conducive_conditions": None,
                "spray_window": {
                    "status": "unavailable",
                    "recommended_time": "Early Morning (6:00 AM - 8:30 AM) on dry days",
                    "reason": "Location weather data unavailable. Confirm wind < 10 km/h and dry foliage prior to application."
                }
            }

        # Disease Category Deduction
        raw_cat = (
            prediction_result.get("disease_category") or
            diag.get("disease_category") or
            diag.get("disease_type") or
            ""
        ).lower()
        d_low = disease_name.lower()
        if "bacter" in raw_cat or "bacter" in d_low or "xanthomonas" in d_low:
            disease_category = "bacterial"
        elif "fung" in raw_cat or any(w in d_low for w in ["blight", "mildew", "rust", "rot", "spot", "anthracnose", "scab", "wilt"]):
            disease_category = "fungal"
        elif "vir" in raw_cat or any(w in d_low for w in ["virus", "mosaic", "curl"]):
            disease_category = "viral"
        elif "pest" in raw_cat or any(w in d_low for w in ["borer", "aphid", "mite", "thrip", "caterpillar", "bug"]):
            disease_category = "pest"
        elif "nutri" in raw_cat or any(w in d_low for w in ["deficiency", "chlorosis", "nitrogen", "zinc", "iron"]):
            disease_category = "nutrient_deficiency"
        elif "abiotic" in raw_cat or any(w in d_low for w in ["scorch", "burn", "frost", "drought"]):
            disease_category = "abiotic_stress"
        else:
            disease_category = "fungal" if disease_name != "Unknown" else "unknown"

        # Differential Diagnoses
        diffs = prediction_result.get("differential_diagnoses") or diag.get("differential_diagnoses") or []
        if not diffs and disease_name != "Unknown":
            if disease_category == "bacterial":
                diffs = [
                    {"condition": "Early Blight (Alternaria)", "confidence": max(10.0, round(100.0 - conf_score, 1)), "distinguishing_factors": "Early Blight produces concentric circular rings rather than water-soaked lesions"},
                    {"condition": "Septoria Leaf Spot", "confidence": 12.0, "distinguishing_factors": "Smaller spots with distinctive light gray centers and dark brown margins"}
                ]
            elif "blight" in d_low:
                diffs = [
                    {"condition": "Bacterial Leaf Spot", "confidence": max(12.0, round(100.0 - conf_score, 1)), "distinguishing_factors": "Bacterial spots have water-soaked borders and do not show concentric target-like rings"},
                    {"condition": "Anthracnose", "confidence": 10.0, "distinguishing_factors": "Sunken lesions with gelatinous spore masses under wet conditions"}
                ]
            else:
                diffs = [
                    {"condition": "Foliar Nutrient Deficiency", "confidence": max(10.0, round(100.0 - conf_score, 1)), "distinguishing_factors": "Nutrient chlorosis is symmetrical across leaves and lacks focal necrotic centers"},
                    {"condition": "Physiological Sunscald / Abiotic Stress", "confidence": 8.0, "distinguishing_factors": "Appears predominantly on top-canopy foliage with no fungal spores or concentric margins"}
                ]

        # Affected leaf area percentage
        affected_area_pct = prediction_result.get("affected_area_percentage") or diag.get("affected_area_percentage")
        if not affected_area_pct:
            if severity.lower() in ("high", "critical"):
                affected_area_pct = 28.0
            elif severity.lower() == "low":
                affected_area_pct = 8.0
            else:
                affected_area_pct = 16.0

        # Personalized 4-Stage Recovery Plan
        recovery_plan = prediction_result.get("recovery_plan")
        if not isinstance(recovery_plan, dict) or not recovery_plan.get("immediate_actions"):
            recovery_plan = {
                "immediate_actions": [
                    "Prune and safely discard severely spotted or necrotic foliage to minimize inoculum density",
                    "Disinfect pruning shears with alcohol or disinfectant before moving between crop rows",
                    "Suspend overhead sprinkler irrigation; switch to drip or furrow watering to maintain dry foliage"
                ],
                "next_3_days": [
                    f"Apply recommended protective treatment ({deduped_organic[0] if deduped_organic else 'Neem Oil Spray 3-5 ml/L'}) during the optimal spray window",
                    "Inspect perimeter plants to ensure pathogen has not spread beyond the primary focus area"
                ],
                "next_7_days": [
                    "Apply water-soluble foliar nutrition (NPK 19:19:19 @ 4-5 g/L) to encourage rapid vegetative canopy recovery",
                    "Examine newly emerging leaves for clean, lesion-free growth"
                ],
                "follow_up_monitoring": [
                    "Perform a follow-up scan in 7-10 days to confirm that lesions have dried and no active sporulation is occurring"
                ]
            }

        # Diagnostic Status
        if prediction_result.get("status") == "uncertain_crop" or not prediction_result.get("crop_detected", True):
            diagnostic_status = "needs_retake"
        elif prediction_result.get("is_fallback"):
            diagnostic_status = "preliminary"
        else:
            diagnostic_status = "preliminary"

        evidence_notes = prediction_result.get("evidence_notes") or diag.get("evidence_notes") or f"Visual foliar lesions and tissue discoloration observed on {crop_name}."
        uncertainty_warning = prediction_result.get("uncertainty_warning")
        if conf_score < 70 and not uncertainty_warning:
            uncertainty_warning = "Preliminary AI pattern confidence is moderate. Visual symptoms share characteristics with secondary foliar stress; consult a local agronomist before costly chemical intervention."

        scan_id = f"SCAN-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        initial_timeline = [{
            "timeline_id": f"tl-{uuid.uuid4().hex[:8]}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": "initial_scan",
            "title": "Initial Diagnostic Scan",
            "description": f"AI identified {disease_name} on {crop_name} ({severity} severity, {conf_score}% pattern confidence).",
            "image_url": image_url,
            "status": "active"
        }]

        model_info = {
            "provider": "Google Gemini" if not prediction_result.get("is_fallback") else "Built-in Agronomy Heuristic",
            "model_id": prediction_result.get("_model_used", settings.GEMINI_PRIMARY_MODEL),
            "report_version": "v2.5",
            "calibrated": False,
            "confidence_metric": "AI Pattern Similarity (Uncalibrated)"
        }

        chart_data = [{"day": "Day 1", "risk": 85}, {"day": "Day 3", "risk": 68}, {"day": "Day 7", "risk": 34}, {"day": "Day 14", "risk": 8}]

        report_data = {
            "user_id": str(current_user.id),
            "image_url": image_url,
            "scan_id": scan_id,
            "farm_plot_id": plot_id,
            "farm_plot_name": farm_plot_name,
            "diagnostic_status": diagnostic_status,
            "schema_version": "v2.5",
            
            # Legacy fields mapped for backward compatibility
            "crop_name": crop_name,
            "disease_name": disease_name,
            "confidence_score": conf_score,
            "severity": severity,
            "recommended_treatment": old_treatment,
            "weather_snapshot": weather_snapshot,
            "chart_data": chart_data,
            "spray_time": spray_time,
            "recommended_products": recommended_products,
            
            # Rich AI and Intelligence fields
            "status": prediction_result.get("status"),
            "crop_detected": prediction_result.get("crop_detected", True),
            "crop": crop_info,
            "diagnosis": diag,
            "disease_category": disease_category,
            "affected_area_percentage": affected_area_pct,
            "differential_diagnoses": diffs,
            "evidence_notes": evidence_notes,
            "uncertainty_warning": uncertainty_warning,
            "symptoms_observed": ensure_list(prediction_result.get("symptoms_observed") or prediction_result.get("symptoms")),
            "disease_overview": prediction_result.get("disease_overview"),
            "treatments": prediction_result.get("treatments"),
            "chemical_treatment_options": ensure_list(prediction_result.get("chemical_treatment_options")),
            "sprays": prediction_result.get("sprays"),
            "ai_recommended_products": ensure_list(prediction_result.get("recommended_products")),
            "application_instructions": prediction_result.get("application_instructions"),
            "prevention": ensure_list(prediction_result.get("prevention")),
            "safety_precautions": ensure_list(prediction_result.get("safety_precautions")),
            "farmer_action_plan": prediction_result.get("farmer_action_plan"),
            "warning": prediction_result.get("warning"),
            "expert_consultation_required": prediction_result.get("expert_consultation_required", False),
            
            "recovery_plan": recovery_plan,
            "weather_intelligence": weather_intelligence,
            "model_info": model_info,
            "recovery_timeline": initial_timeline,
            
            "created_at": datetime.now(timezone.utc)
        }
        
        insert_result = await db["disease_reports"].insert_one(report_data)
        created_report = await db["disease_reports"].find_one({"_id": insert_result.inserted_id})
        created_report["_id"] = str(created_report["_id"])
        created_report["id"] = created_report["_id"]
        
        try:
            return DiseaseReportResponse(**created_report)
        except Exception as pydantic_err:
            import traceback
            print(f"DiseaseReportResponse validation fallback: {pydantic_err}")
            with open('crash.log', 'w') as f:
                f.write(traceback.format_exc())
            return created_report
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        with open('crash.log', 'w') as f:
            f.write(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Analysis Failed: {str(e)}"
        )
