import os
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv("../backend/.env")
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("API Key not found.")
    exit(1)

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")

with open("src/i18n.js", "r") as f:
    code = f.read()

en_match = re.search(r'const enTranslation = (\{.*?\});', code, re.DOTALL)
if not en_match:
    print("enTranslation not found")
    exit(1)

en_dict = json.loads(en_match.group(1))

# Process in chunks of 200 keys to avoid token limits or output cutoffs
keys = list(en_dict.keys())
values = list(en_dict.values())
chunk_size = 200

kn_dict = {}
hi_dict = {}

for i in range(0, len(keys), chunk_size):
    chunk_keys = keys[i:i+chunk_size]
    chunk_dict = {k: en_dict[k] for k in chunk_keys}
    
    prompt = f"""
    You are a professional software localization expert.
    Translate the following JSON values from English to Kannada and Hindi.
    Only return a valid JSON object in this exact schema, nothing else (no markdown formatting, no backticks).
    {{
        "kn": {{ "key": "kannada translation" }},
        "hi": {{ "key": "hindi translation" }}
    }}
    
    Here is the JSON to translate:
    {json.dumps(chunk_dict, indent=2)}
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(text)
        
        kn_dict.update(result.get("kn", {}))
        hi_dict.update(result.get("hi", {}))
        print(f"Successfully translated chunk {i//chunk_size + 1}")
    except Exception as e:
        print(f"Error in chunk {i//chunk_size + 1}: {e}")
        # fallback to english for this chunk if fails
        for k in chunk_keys:
            if k not in kn_dict: kn_dict[k] = en_dict[k]
            if k not in hi_dict: hi_dict[k] = en_dict[k]

new_code = code.replace("const knTranslation = {};", f"const knTranslation = {json.dumps(kn_dict, indent=2, ensure_ascii=False)};")
new_code = new_code.replace("const hiTranslation = {};", f"const hiTranslation = {json.dumps(hi_dict, indent=2, ensure_ascii=False)};")

with open("src/i18n.js", "w") as f:
    f.write(new_code)
    
print("Translations generated via Gemini successfully!")
