import os
import cloudinary
import cloudinary.uploader
import httpx
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from typing import Optional
from datetime import datetime, timezone, timedelta
import json

from app.core.database import get_mongo_db
from app.models.user import UserResponse
from app.models.report import DiseaseReportResponse
from app.api.dependencies import get_current_user
from app.services.ml_service import predict_image
from app.core.config import settings

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
            with open("error.log", "w") as f:
                f.write(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"ML Inference Failed: {str(e)}")
    
        if user_dict:
            await db["users"].update_one({"id": current_user.id}, {"$inc": {"scan_count": 1}})
    
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
    
        weather_snapshot = None
        spray_time = "Tomorrow, 6:00 AM - 8:30 AM"
        if latitude is not None and longitude is not None:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    resp = await client.get(f"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m")
                    if resp.status_code == 200:
                        wdata = resp.json()
                        current_w = wdata.get("current", {})
                        temp = current_w.get("temperature_2m")
                        hum = current_w.get("relative_humidity_2m")
                        wind = current_w.get("wind_speed_10m", 0)
                        if temp is not None and hum is not None:
                            weather_snapshot = {"temperature": f"{temp}°C", "humidity": f"{hum}%"}
                            if wind > 15: spray_time = "Delay spray due to high winds"
                            elif temp > 30: spray_time = "Tomorrow, 5:30 AM - 7:30 AM (avoid heat)"
            except Exception:
                pass
    
        chart_data = [{"day": "Day 1", "risk": 85}, {"day": "Day 3", "risk": 68}, {"day": "Day 7", "risk": 34}, {"day": "Day 14", "risk": 8}]
    
        report_data = {
            "user_id": str(current_user.id),
            "image_url": image_url,
            
            # OLD fields mapped for backward compatibility
            "crop_name": crop_name,
            "disease_name": disease_name,
            "confidence_score": conf_score,
            "severity": severity,
            "recommended_treatment": old_treatment,
            "weather_snapshot": weather_snapshot,
            "chart_data": chart_data,
            "spray_time": spray_time,
            "recommended_products": recommended_products,
            
            # NEW rich AI fields
            "status": prediction_result.get("status"),
            "crop_detected": prediction_result.get("crop_detected", True),
            "crop": crop_info,
            "diagnosis": diag,
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
