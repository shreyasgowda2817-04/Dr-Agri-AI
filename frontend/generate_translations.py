import json
import urllib.request
import urllib.parse
import re
import ssl
import time

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def translate_batch(texts, target_lang):
    # Join texts with a special separator
    combined = " ||| ".join(texts)
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={target_lang}&dt=t&q={urllib.parse.quote(combined)}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response:
            result = json.loads(response.read().decode('utf-8'))
            translated_combined = "".join([x[0] for x in result[0]])
            return [t.strip() for t in translated_combined.split("|||")]
    except Exception as e:
        print(f"Error translating: {e}")
        return texts

with open("src/i18n.js", "r") as f:
    code = f.read()

en_match = re.search(r'const enTranslation = (\{.*?\});', code, re.DOTALL)
if not en_match:
    print("enTranslation not found")
    exit(1)

en_dict = json.loads(en_match.group(1))
keys = list(en_dict.keys())
values = list(en_dict.values())

kn_dict = {}
hi_dict = {}

batch_size = 20
for i in range(0, len(keys), batch_size):
    batch_keys = keys[i:i+batch_size]
    batch_values = values[i:i+batch_size]
    
    # Translate Kannada
    kn_translated = translate_batch(batch_values, "kn")
    time.sleep(1) # avoid 429
    
    # Translate Hindi
    hi_translated = translate_batch(batch_values, "hi")
    time.sleep(1)
    
    for j, key in enumerate(batch_keys):
        kn_dict[key] = kn_translated[j] if j < len(kn_translated) else batch_values[j]
        hi_dict[key] = hi_translated[j] if j < len(hi_translated) else batch_values[j]
        
    print(f"Translated {i + len(batch_keys)} / {len(keys)}")

# Replace in code
new_code = code.replace("const knTranslation = {};", f"const knTranslation = {json.dumps(kn_dict, indent=2, ensure_ascii=False)};")
new_code = new_code.replace("const hiTranslation = {};", f"const hiTranslation = {json.dumps(hi_dict, indent=2, ensure_ascii=False)};")

with open("src/i18n.js", "w") as f:
    f.write(new_code)
    
print("Translations generated successfully!")
