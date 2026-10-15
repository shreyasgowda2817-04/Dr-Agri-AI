import json
import urllib.request
import urllib.parse
import re
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def translate(text, target_lang):
    if not text.strip(): return text
    url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl={target_lang}&dt=t&q={urllib.parse.quote(text)}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx) as response:
            result = json.loads(response.read().decode('utf-8'))
            return "".join([x[0] for x in result[0]])
    except Exception as e:
        print(f"Error translating {text}: {e}")
        return text

with open("src/i18n.js", "r") as f:
    code = f.read()

# Extract enTranslation object
en_match = re.search(r'const enTranslation = (\{.*?\});', code, re.DOTALL)
if not en_match:
    print("enTranslation not found")
    exit(1)

en_dict = json.loads(en_match.group(1))

# Batching to translate faster
kn_dict = {}
hi_dict = {}
count = 0
for k, v in en_dict.items():
    kn_dict[k] = translate(v, "kn")
    hi_dict[k] = translate(v, "hi")
    count += 1
    if count % 100 == 0:
        print(f"Translated {count}/{len(en_dict)}")

new_code = code.replace("const knTranslation = {};", f"const knTranslation = {json.dumps(kn_dict, indent=2, ensure_ascii=False)};")
new_code = new_code.replace("const hiTranslation = {};", f"const hiTranslation = {json.dumps(hi_dict, indent=2, ensure_ascii=False)};")

with open("src/i18n.js", "w") as f:
    f.write(new_code)
print("Translations generated successfully!")
