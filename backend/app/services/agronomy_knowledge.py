"""
Dr Agri AI - Advanced Autonomous Agronomy Knowledge Engine
Provides intelligent, multi-lingual agronomy consultation when external LLMs
(Gemini API) are unreachable, unauthenticated, rate-limited, or awaiting user key setup.
"""

import re
from typing import Optional, Dict, Any, List

CROP_DATABASE = {
    "tomato": {
        "name": "Tomato",
        "common_diseases": {
            "blight": {
                "name": "Tomato Early/Late Blight (Alternaria / Phytophthora)",
                "symptoms": "Dark brown concentric rings on lower leaves, spreading to stems and fruit.",
                "action": [
                    "Prune affected lower leaves immediately to stop spore splash.",
                    "Spray Mancozeb 75% WP (2 g/L) or Copper Oxychloride 50% WP (2.5 g/L).",
                    "For organic control, apply cold-pressed Neem Oil (3 ml/L) + Trichoderma viride."
                ],
                "warning": "Avoid overhead watering; wet foliage accelerates spore germination.",
                "next_step": "Monitor new growth after 48 hours for lesion drying."
            },
            "curl": {
                "name": "Tomato Leaf Curl Virus (ToLCV)",
                "symptoms": "Upward curling, puckering of leaves, stunted plant height, chlorotic margins.",
                "action": [
                    "Target whitefly vectors: Install yellow sticky traps (15-20 traps per acre).",
                    "Spray Imidacloprid 17.8% SL (0.5 ml/L) or Neem oil 1500 ppm (4 ml/L) during early morning.",
                    "Rogue and safely bury severely stunted viral plants."
                ],
                "warning": "Once infected, virus cannot be cured in the plant; vector suppression is critical.",
                "next_step": "Inspect underside of young leaves for whitefly nymphs."
            },
            "wilt": {
                "name": "Bacterial / Fusarium Wilt",
                "symptoms": "Rapid daytime wilting without yellowing (bacterial) or yellowing on one side (fusarium).",
                "action": [
                    "Drench root zone with Copper Oxychloride (3 g/L) + Streptocycline (1 g/10 L water).",
                    "Improve field drainage and avoid water stagnation.",
                    "Apply Trichoderma viride enriched FYM in subsequent planting."
                ],
                "warning": "Do not cultivate soil near roots when soil is wet to prevent vascular root wounds.",
                "next_step": "Check stem vascular ring for brown bacterial streaming."
            }
        },
        "fertilizer_guide": "Basal: DAP (50 kg/acre) + MOP (30 kg/acre). Foliar: NPK 19:19:19 (4 g/L) at vegetative; NPK 13:0:45 + Micronutrients (Boron + Calcium) at flowering and fruit set to prevent blossom end rot."
    },
    "potato": {
        "name": "Potato",
        "common_diseases": {
            "blight": {
                "name": "Potato Late Blight (Phytophthora infestans)",
                "symptoms": "Water-soaked dark lesions on leaf tips with white mildew growth on underside in humid weather.",
                "action": [
                    "Spray systemic fungicide Cymoxanil + Mancozeb (2 g/L) or Metalaxyl-M (2.5 g/L).",
                    "Ensure high earthing-up to prevent spores washing into soil and infecting tubers.",
                    "Destroy haulms 10-12 days before harvest if late blight is active in the canopy."
                ],
                "warning": "Late blight can destroy canopy within 5-7 days under cool, fog/humid conditions.",
                "next_step": "Check perimeter rows daily for white underside fungal sporulation."
            }
        },
        "fertilizer_guide": "Potato requires high potassium: Apply 60 kg Nitrogen, 40 kg Phosphorus, and 80 kg Potassium per acre. Apply SOP (Sulphate of Potash) for better tuber skin quality."
    },
    "chilli": {
        "name": "Chilli / Pepper",
        "common_diseases": {
            "curl": {
                "name": "Chilli Leaf Curl & Thrips/Mite Complex",
                "symptoms": "Leaves curling upward (thrips damage) or curling downward into boat shapes (yellow mite damage).",
                "action": [
                    "For upward curl (Thrips): Spray Fipronil 5% SC (1.5 ml/L) or Spinetoram 11.7% SC (1 ml/L).",
                    "For downward curl (Mites): Spray Diafenthiuron 50% WP (1.2 g/L) or Spiromesifen 22.9% SC (1 ml/L).",
                    "Organic option: Spray 5% Neem Seed Kernel Extract (NSKE) or Pongamia oil."
                ],
                "warning": "Do not spray broad-spectrum pyrethroids as they flare mite populations by killing predators.",
                "next_step": "Use a 10x hand lens under leaves to identify whether pest is yellow mite or thrips."
            },
            "anthracnose": {
                "name": "Chilli Anthracnose / Dieback / Fruit Rot",
                "symptoms": "Sunken circular dark spots on ripening chillies, black concentric dots, dying branch tips.",
                "action": [
                    "Spray Azoxystrobin 18.2% + Difenoconazole 11.4% SC (1 ml/L) or Propiconazole 25% EC (1 ml/L).",
                    "Pick and destroy affected rotten fruits before spraying."
                ],
                "warning": "High temperature with intermittent rainfall triggers rapid fruit infection.",
                "next_step": "Avoid overhead sprinkler irrigation during ripening phase."
            }
        },
        "fertilizer_guide": "Top-dress with Urea (25 kg/acre) + Potash (15 kg/acre) in 3 split doses. Spray Calcium Nitrate (5 g/L) + Boron (1 g/L) at fruit development."
    },
    "rice": {
        "name": "Rice / Paddy",
        "common_diseases": {
            "blast": {
                "name": "Paddy Blast (Magnaporthe oryzae)",
                "symptoms": "Spindle-shaped lesions with brown borders and grey centers on leaves; black nodal blast.",
                "action": [
                    "Spray Tricyclazole 75% WP (0.6 g/L) or Isoprothiolane 40% EC (1.5 ml/L).",
                    "Avoid excessive top-dressing of nitrogenous fertilizers.",
                    "Maintain continuous thin water layer in field."
                ],
                "warning": "Cool night temperatures with high relative humidity (>90%) favor blast epidemic.",
                "next_step": "Inspect neck junction of flag leaves before panicle emergence."
            },
            "borer": {
                "name": "Yellow Stem Borer",
                "symptoms": "Dead hearts in vegetative stage and white ears (chaffy panicles) in reproductive stage.",
                "action": [
                    "Apply Chlorantraniliprole 0.4% GR (4 kg/acre) or Cartap Hydrochloride 4% G (7.5 kg/acre) in standing water.",
                    "Install pheromone traps @ 8 traps/acre for adult moth monitoring."
                ],
                "warning": "Maintain 2-3 inches of standing water for 48 hours after granular insecticide application.",
                "next_step": "Inspect central shoots for pull-out dead hearts."
            }
        },
        "fertilizer_guide": "Apply NPK 100:50:50 kg/ha. Apply Zinc Sulphate (10 kg/acre) at basal puddling to avoid Khaira disease (zinc deficiency)."
    },
    "wheat": {
        "name": "Wheat",
        "common_diseases": {
            "rust": {
                "name": "Stripe / Yellow Rust or Brown Leaf Rust",
                "symptoms": "Yellowish-orange pustules arranged in linear stripes on leaf blades.",
                "action": [
                    "Spray Propiconazole 25% EC (1 ml/L) or Tebuconazole 25.9% EC (1 ml/L) immediately upon first sighting.",
                    "Spray 200 liters of spray solution per acre with hollow cone nozzle for full canopy coverage."
                ],
                "warning": "Stripe rust spores spread rapidly through wind; delay in spraying can reduce yield by 30-50%.",
                "next_step": "Check cooler, morning dew-prone corners of the plot."
            }
        },
        "fertilizer_guide": "Apply 50 kg Urea + 50 kg DAP per acre at sowing; top dress 25 kg Urea at Crown Root Initiation (CRI, 21 days) with first irrigation."
    },
    "maize": {
        "name": "Maize / Corn",
        "common_diseases": {
            "armyworm": {
                "name": "Fall Armyworm (Spodoptera frugiperda)",
                "symptoms": "Pin-holes on whorl leaves, extensive window pane feeding, dense sawdust-like frass inside the whorl.",
                "action": [
                    "Direct spray into the central whorl with Emamectin Benzoate 5% SG (0.4 g/L) or Chlorantraniliprole 18.5% SC (0.4 ml/L).",
                    "Apply dry sand or wood ash + lime into the whorl as an organic physical barrier.",
                    "Spray early in the morning or late evening when larvae are active."
                ],
                "warning": "Regular broadcast spraying does not kill larvae hidden deep inside whorl.",
                "next_step": "Scout 20 plants per row; take action if >10% of plants show windowed leaves."
            }
        },
        "fertilizer_guide": "Maize is a heavy feeder: Apply 50 kg DAP + 20 kg Potash at sowing. Top dress Urea in two equal splits at knee-high stage and tasseling stage."
    },
    "cotton": {
        "name": "Cotton",
        "common_diseases": {
            "bollworm": {
                "name": "Pink Bollworm (Pectinophora gossypiella)",
                "symptoms": "Rosetted flowers, bore holes plugged with excreta in developing green bolls.",
                "action": [
                    "Install pheromone traps with Gossyplure @ 8 traps/acre.",
                    "Spray Chlorantraniliprole 18.5% SC (0.3 ml/L) or Profenofos 50% EC (2 ml/L) at boll initiation.",
                    "Release Trichogramma egg parasitoids @ 60,000/acre."
                ],
                "warning": "Do not extend crop duration past 160 days to break pink bollworm life cycle.",
                "next_step": "Dissect 10 randomly sampled green bolls to check for internal larval entry."
            }
        },
        "fertilizer_guide": "Apply NPK in split doses. Spray 2% DAP or 1% Potassium Nitrate (13:0:45) + 0.1% Boron at peak flowering to reduce boll dropping."
    },
    "onion": {
        "name": "Onion",
        "common_diseases": {
            "thrips": {
                "name": "Onion Thrips & Purple Blotch (Alternaria porri)",
                "symptoms": "Silvery white patches on leaf blades accompanied by purplish brown lesions with yellow halos.",
                "action": [
                    "Spray Cyantraniliprole 10.26% OD (1.2 ml/L) or Fipronil (1.5 ml/L) mixed with sticker/spreader.",
                    "Add Mancozeb 75% WP (2.5 g/L) to manage concurrent purple blotch.",
                    "Always use a silicon sticker (0.5 ml/L) because onion leaves are waxy and shed spray droplets."
                ],
                "warning": "Never spray without an agricultural spreader/sticker on onion foliage.",
                "next_step": "Check the leaf sheath axis where thrips congregate."
            }
        },
        "fertilizer_guide": "Apply Sulphur (15-20 kg/acre) at transplanting; sulphur increases pungency, bulb density, and storage shelf-life."
    }
}


GENERAL_TOPICS = {
    "fertilizer": {
        "title": "Comprehensive Plant Nutrition & Soil Fertility",
        "advice": (
            "🌱 **Quick Recommendation**\n"
            "Balanced crop nutrition requires a baseline NPK ratio supplemented with secondary nutrients (Sulphur, Calcium, Magnesium) and micronutrients (Zinc, Boron).\n\n"
            "**What to do now**\n"
            "• Vegetative stage: Focus on Nitrogen and Phosphorus (DAP / 19:19:19) for root and canopy development.\n"
            "• Flowering & Fruiting: Switch to High-Potassium foliar nutrition (NPK 13:0:45 or 0:0:50 @ 5 g/L) + Boron (1 g/L) to prevent fruit drop and boost size.\n"
            "• Soil Health: Incorporate well-decomposed FYM or vermicompost (2 tons/acre) with Trichoderma.\n\n"
            "**Watch for**\n"
            "• Interveinal yellowing indicates Iron or Magnesium deficiency, while yellowing of older lower leaves indicates Nitrogen deficiency.\n\n"
            "**Next step**\n"
            "Conduct a soil test every 2 years to avoid unnecessary excess fertilizer expenses."
        )
    },
    "weather": {
        "title": "Microclimate & Spray Advisory",
        "advice": (
            "🌱 **Quick Recommendation**\n"
            "Agrochemical application requires strict meteorological alignment to prevent spray drift and chemical wash-off.\n\n"
            "**What to do now**\n"
            "• Optimal Spray Window: Early morning (6:30 AM – 9:30 AM) when wind speed is below 12 km/h and relative humidity is between 60-80%.\n"
            "• Delay Spraying if: Rain is forecast within 4-6 hours, wind exceeds 14 km/h, or ambient temperature exceeds 32°C (causes chemical evaporation and leaf scorch).\n\n"
            "**Watch for**\n"
            "• Rainfastness: Systemic chemicals require at least 2 hours of dry foliage after application to absorb.\n\n"
            "**Next step**\n"
            "Always include a non-ionic spreader/sticker (0.5 ml/L) to improve droplet coverage on the leaf surface."
        )
    },
    "pesticide": {
        "title": "Safe Pesticide & Integrated Pest Management (IPM)",
        "advice": (
            "🌱 **Quick Recommendation**\n"
            "Follow the CIBRC safety guidelines: rotate chemical mode of action (IRAC/FRAC groups) to prevent pest resistance.\n\n"
            "**What to do now**\n"
            "• First line of defense: Neem Oil (1500-3000 ppm @ 3-5 ml/L) or biological agents (Beauveria bassiana for caterpillars, Verticillium for sucking pests).\n"
            "• Chemical spray: Apply verified active ingredients at recommended dosages. Never mix incompatible organophosphates with alkaline sprays.\n"
            "• Safety Gear (PPE): Always wear gloves, eye goggles, and a respiratory mask while mixing and spraying.\n\n"
            "**Watch for**\n"
            "• Respect Pre-Harvest Interval (PHI): Do not harvest crops before the stipulated waiting period (e.g. 3-7 days for vegetables).\n\n"
            "**Next step**\n"
            "Calibrate your sprayer nozzle before application to ensure uniform droplet spectrum."
        )
    },
    "irrigation": {
        "title": "Water Management & Irrigation Scheduling",
        "advice": (
            "🌱 **Quick Recommendation**\n"
            "Over-irrigation is the #1 cause of root rot and damping-off fungal infections.\n\n"
            "**What to do now**\n"
            "• Water during early morning to reduce evaporative loss and keep foliage dry before nightfall.\n"
            "• Adopt drip irrigation: saves 40-50% water while delivering soluble fertilizers directly to the active root zone.\n"
            "• Critical watering stages: Seedling emergence, flowering initiation, and fruit/grain filling.\n\n"
            "**Watch for**\n"
            "• Prolonged water stagnation leads to root hypoxia, yellowing, and vascular wilting.\n\n"
            "**Next step**\n"
            "Check soil moisture at 4-inch depth with a soil probe before scheduling your next irrigation cycle."
        )
    }
}


def build_agronomy_expert_response(
    query: str,
    language: str = "en-US",
    user_context: str = "",
    weather_info: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generates a high-quality, structured agronomy answer based on agricultural science rules,
    context parsing, and language localization.
    """
    q_low = query.lower()
    lang_code = language[:2].lower()

    # Detect crop
    detected_crop_key = None
    for crop_key in CROP_DATABASE.keys():
        if crop_key in q_low or (crop_key == "rice" and "paddy" in q_low) or (crop_key == "maize" and "corn" in q_low) or (crop_key == "chilli" and ("chili" in q_low or "pepper" in q_low)):
            detected_crop_key = crop_key
            break

    # Intent flags
    is_fertilizer_query = any(w in q_low for w in ["fertilizer", "fertiliser", "nutrition", "npk", "urea", "dap", "potash", "yield", "dose", "dosage", "feed", "खाद", "उर्वरक", "ಗೊಬ್ಬರ"])
    is_spray_weather_query = any(w in q_low for w in ["spray today", "spray now", "weather spray", "wind spray", "can i spray", "should i spray", "rain spray"])
    
    if is_spray_weather_query:
        return localize_text(GENERAL_TOPICS["weather"]["advice"], lang_code)

    # 1. When crop is detected
    if detected_crop_key:
        crop_data = CROP_DATABASE[detected_crop_key]
        
        # If user explicitly asked about fertilizer/nutrition for this crop
        if is_fertilizer_query:
            return format_fertilizer_response(crop_data["name"], crop_data.get("fertilizer_guide", ""), lang_code)

        # Check for specific diseases of this crop
        for d_key, d_info in crop_data.get("common_diseases", {}).items():
            # Match disease key or key terms from disease name (excluding crop name)
            d_name_words = [w for w in re.findall(r'\b\w+\b', d_info["name"].lower()) if len(w) > 3 and w not in ["tomato", "potato", "chilli", "rice", "wheat", "maize", "cotton", "onion", "early", "late"]]
            if d_key in q_low or any(w in q_low for w in d_name_words):
                return format_disease_response(crop_data["name"], d_info, lang_code, weather_info)

        # If user mentioned general disease/pest words without naming a specific disease
        if any(w in q_low for w in ["disease", "fungus", "infection", "pest", "insect", "dying", "yellow", "spots", "rot", "कीट", "रोग", "ರೋಗ"]):
            first_disease = list(crop_data.get("common_diseases", {}).values())[0]
            return format_disease_response(crop_data["name"], first_disease, lang_code, weather_info)

        # General inquiry about this crop
        return format_crop_general_response(crop_data, lang_code, weather_info)

    # General Topic Detection
    for topic_key, topic_data in GENERAL_TOPICS.items():
        if topic_key in q_low or (topic_key == "pesticide" and any(w in q_low for w in ["spray", "fungicide", "insecticide", "pest", "chemical", "कीटनाशक", "ಔಷಧಿ"])) or (topic_key == "fertilizer" and any(w in q_low for w in ["fertilizer", "dap", "npk", "urea", "nutrition", "उर्वरक", "खाद", "ಗೊಬ್ಬರ"])) or (topic_key == "weather" and any(w in q_low for w in ["weather", "rain", "wind", "temp", "मौसम", "ಮಳೆ", "ಹವಾಮಾನ"])) or (topic_key == "irrigation" and any(w in q_low for w in ["water", "irrigation", "drip", "सिंचाई", "ನೀರು"])):
            return localize_text(topic_data["advice"], lang_code)

    # Fallback to smart diagnostic inquiry
    if lang_code == "hi":
        return (
            "🌱 **त्वरित कृषि मार्गदर्शन**\n"
            "मैं आपका डॉ एग्री एआई (Dr Agri AI) विशेषज्ञ हूँ। मैं आपकी फसल, रोग पहचान, मौसम और उर्वरक प्रबंधन में मदद कर सकता हूँ।\n\n"
            "**अब क्या करें**\n"
            "• अपनी विशिष्ट फसल का नाम बताएं (उदा. टमाटर, धान, मिर्च, कपास, गेहूं, मक्का)।\n"
            "• पौधे में दिखाई देने वाले लक्षण बताएं (जैसे पत्तियों का पीला पड़ना, काले धब्बे, या मुड़ना)।\n\n"
            "**निगरानी**\n"
            "• बीमारी की प्रारंभिक अवस्था में उपचार करने से 80% तक फसल का नुकसान रुक जाता है।\n\n"
            "**अगला कदम**\n"
            "फसल की स्पष्ट फोटो 'क्रॉप स्कैन' (Crop Scan) में अपलोड करें या अपनी समस्या का विवरण टाइप करें।"
        )
    elif lang_code == "kn":
        return (
            "🌱 **ತ್ವರಿತ ಕೃಷಿ ಸಲಹೆ**\n"
            "ನಾನು ನಿಮ್ಮ ಡಾ ಅಗ್ರಿ ಎಐ (Dr Agri AI) ತಜ್ಞ. ನಿಮ್ಮ ಬೆಳೆ ರೋಗ, ರಸಗೊಬ್ಬರ ಮತ್ತು ಹವಾಮಾನ ನಿರ್ವಹಣೆಗೆ ನಾನು ಸದಾ ಸಿದ್ಧ.\n\n"
            "**ಈಗ ಏನು ಮಾಡಬೇಕು**\n"
            "• ನಿಮ್ಮ ಬೆಳೆಯ ಹೆಸರನ್ನು ತಿಳಿಸಿ (ಉದಾ. ಟೊಮೆಟೊ, ಭತ್ತ, ಮೆಣಸಿನಕಾಯಿ, ಹತ್ತಿ, ಗೋಧಿ, ಜೋಳ).\n"
            "• ಎಲೆಗಳಲ್ಲಿ ಕಾಣುವ ಲಕ್ಷಣಗಳನ್ನು ತಿಳಿಸಿ (ಉದಾ. ಎಲೆ ಹಳದಿ ಬಣ್ಣಕ್ಕೆ ತಿರುಗುವುದು, ಕಪ್ಪು ಚುಕ್ಕೆಗಳು, ಅಥವಾ ಎಲೆ ಮುದುಡುವಿಕೆ).\n\n"
            "**ಗಮನಿಸಿ**\n"
            "• ರೋಗ ಪ್ರಾರಂಭವಾದ ತಕ್ಷಣ ಕ್ರಮ ಕೈಗೊಂಡರೆ 80% ನಷ್ಟು ಬೆಳೆ ನಷ್ಟವನ್ನು ತಡೆಯಬಹುದು.\n\n"
            "**ಮುಂದಿನ ಹೆಜ್ಜೆ**\n"
            "ನಿಮ್ಮ ಬೆಳೆಯ ಫೋಟೋವನ್ನು 'ಕ್ರಾಪ್ ಸ್ಕ್ಯಾನ್' (Crop Scan) ನಲ್ಲಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಅಥವಾ ಪ್ರಶ್ನೆಯನ್ನು ವಿವರವಾಗಿ ಟೈಪ್ ಮಾಡಿ."
        )

    return (
        "🌱 **Quick Recommendation**\n"
        "I am Dr Agri AI, your agronomic intelligence specialist. I can assist you with disease diagnosis, spray windows, dosage calculations, and nutrient management.\n\n"
        "**What to do now**\n"
        "• Specify the exact crop you are inquiring about (e.g., Tomato, Paddy/Rice, Chilli, Cotton, Wheat, Maize, Onion).\n"
        "• Describe visible foliar signs (e.g., brown spots, leaf curl, wilting, or yellow margins).\n\n"
        "**Watch for**\n"
        "• Early pathogen detection prevents up to 80% of canopy losses.\n\n"
        "**Next step**\n"
        "You can also upload a close-up leaf photo via 'Crop Scan' for automated biomarker pathology analysis."
    )


def format_disease_response(crop_name: str, d_info: Dict[str, Any], lang_code: str, weather_info: Optional[Dict[str, Any]]) -> str:
    weather_note = ""
    if weather_info:
        temp = weather_info.get("temperature", "")
        rain = weather_info.get("rain_probability", 0)
        if rain and int(rain) > 30:
            weather_note = f"\n• ⚠️ Rain forecast risk is {rain}%. Delay foliar chemical spraying until canopy dries.\n"

    actions = "\n".join([f"• {act}" for act in d_info.get("action", [])])
    
    if lang_code == "hi":
        return (
            f"🌱 **त्वरित निदान: {crop_name} — {d_info['name']}**\n"
            f"लक्षण: {d_info.get('symptoms')}\n\n"
            f"**अब क्या करें**\n"
            f"{actions}\n{weather_note}\n"
            f"**सावधानी**\n"
            f"• {d_info.get('warning')}\n\n"
            f"**अगला कदम**\n"
            f"{d_info.get('next_step')}"
        )
    elif lang_code == "kn":
        return (
            f"🌱 **ತ್ವರಿತ ರೋಗ ನಿರ್ಣಯ: {crop_name} — {d_info['name']}**\n"
            f"ಲಕ್ಷಣಗಳು: {d_info.get('symptoms')}\n\n"
            f"**ಈಗ ಏನು ಮಾಡಬೇಕು**\n"
            f"{actions}\n{weather_note}\n"
            f"**ಎಚ್ಚರಿಕೆ**\n"
            f"• {d_info.get('warning')}\n\n"
            f"**ಮುಂದಿನ ಹೆಜ್ಜೆ**\n"
            f"{d_info.get('next_step')}"
        )

    return (
        f"🌱 **Quick Diagnosis: {crop_name} — {d_info['name']}**\n"
        f"Key Symptoms: {d_info.get('symptoms')}\n\n"
        f"**What to do now**\n"
        f"{actions}\n{weather_note}\n"
        f"**Watch for**\n"
        f"• {d_info.get('warning')}\n\n"
        f"**Next step**\n"
        f"{d_info.get('next_step')}"
    )


def format_fertilizer_response(crop_name: str, guide: str, lang_code: str) -> str:
    if lang_code == "hi":
        return (
            f"🌱 **{crop_name} के लिए उर्वरक और पोषण अनुशंसा**\n"
            f"{guide}\n\n"
            f"**अब क्या करें**\n"
            f"• बेसल खुराक हमेशा बुवाई या रोपाई के समय दें।\n"
            f"• फूल और फल लगने की अवस्था में NPK 19:19:19 या 13:0:45 (4-5 ग्राम/लीटर) का पर्णीय छिड़काव करें।\n\n"
            f"**सावधानी**\n"
            f"• सूखी मिट्टी में कभी भी यूरिया का छिड़काव या प्रयोग न करें; प्रयोग से पहले हल्की सिंचाई सुनिश्चित करें।"
        )
    elif lang_code == "kn":
        return (
            f"🌱 **{crop_name} ಬೆಳೆಗಾಗಿ ರಸಗೊಬ್ಬರ ಮತ್ತು ಪೋಷಕಾಂಶಗಳ ಶಿಫಾರಸು**\n"
            f"{guide}\n\n"
            f"**ಈಗ ಏನು ಮಾಡಬೇಕು**\n"
            f"• ಬಿತ್ತನೆ ಅಥವಾ ನಾಟಿ ಸಮಯದಲ್ಲಿ ಶಿಫಾರಸು ಮಾಡಿದ ಆರಂಭಿಕ ರಸಗೊಬ್ಬರ ನೀಡಿ.\n"
            f"• ಹೂವು ಮತ್ತು ಕಾಯಿ ಕಟ್ಟುವ ಹಂತದಲ್ಲಿ NPK 19:19:19 ಅಥವಾ 13:0:45 (4-5 ಗ್ರಾಂ/ಲೀಟರ್) ಸಿಂಪಡಿಸಿ.\n\n"
            f"**ಎಚ್ಚರಿಕೆ**\n"
            f"• ಒಣ ಮಣ್ಣಿನಲ್ಲಿ ಎಂದಿಗೂ ಯೂರಿಯಾ ಹಾಕಬೇಡಿ; ಗೊಬ್ಬರ ಹಾಕುವ ಮೊದಲು ಲಘು ನೀರಾವರಿ ಒದಗಿಸಿ."
        )

    return (
        f"🌱 **Nutrient & Fertilizer Advisory for {crop_name}**\n"
        f"{guide}\n\n"
        f"**What to do now**\n"
        f"• Apply basal phosphorus and potassium at transplanting/sowing for deep root establishment.\n"
        f"• Apply water-soluble foliar nutrition (NPK 19:19:19 @ 4-5 g/L) during rapid canopy expansion.\n\n"
        f"**Watch for**\n"
        f"• Avoid applying dry granular nitrogen to drought-stressed soil without prior irrigation."
    )


def format_crop_general_response(crop_data: Dict[str, Any], lang_code: str, weather_info: Optional[Dict[str, Any]]) -> str:
    name = crop_data["name"]
    diseases = list(crop_data.get("common_diseases", {}).keys())
    dis_str = ", ".join([d.title() for d in diseases])
    guide = crop_data.get("fertilizer_guide", "")

    return (
        f"🌱 **Quick Guide: {name} Management**\n"
        f"Common production challenges include: {dis_str}.\n\n"
        f"**Nutrition Overview**\n"
        f"• {guide}\n\n"
        f"**What to do now**\n"
        f"• Regularly scout lower leaf surfaces for early fungal spots or sap-sucking nymphs.\n"
        f"• Maintain optimal plant spacing for healthy airflow and disease prevention.\n\n"
        f"**Next step**\n"
        f"Let me know if you are observing specific symptoms like spots, yellowing, or leaf curl on your {name}."
    )


def localize_text(text: str, lang_code: str) -> str:
    # Text is already structured with standard formatting
    return text
