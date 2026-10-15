import re

with open('src/i18n.js', 'r') as f:
    code = f.read()

# Replace EVERYTHING inside knTranslation with just the overrides
kn_overrides = """{
  "financial_ledger": "ಹಣಕಾಸು ಲೆಡ್ಜರ್",
  "operating_expenses": "ಕಾರ್ಯಾಚರಣೆ ವೆಚ್ಚಗಳು",
  "gross_revenue": "ಒಟ್ಟು ಆದಾಯ",
  "net_profit_ytd": "ನಿವ್ವಳ ಲಾಭ (ವಾರ್ಷಿಕ)",
  "profitability_trend": "ಲಾಭದಾಯಕತೆಯ ಪ್ರವೃತ್ತಿ",
  "transaction_ledger": "ವಹಿವಾಟು ಲೆಡ್ಜರ್",
  "date": "ದಿನಾಂಕ",
  "type": "ಮಾದರಿ",
  "category": "ವರ್ಗ",
  "description": "ವಿವರಣೆ",
  "amount": "ಮೊತ್ತ",
  "action": "ಕ್ರಿಯೆ",
  "download_report": "ವರದಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
  "transaction": "ವಹಿವಾಟು",
  "dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
  "finance": "ಹಣಕಾಸು",
  "farm_plots": "ಕೃಷಿ ಪ್ಲಾಟ್‌ಗಳು",
  "my_crops": "ನನ್ನ ಬೆಳೆಗಳು",
  "price_predictor": "ಬೆಲೆ ಮುನ್ಸೂಚಕ",
  "drone_recovery": "ಡ್ರೋನ್ ರಿಕವರಿ",
  "ai_assistant": "ಎಐ ಸಹಾಯಕ",
  "marketplace": "ಮಾರುಕಟ್ಟೆ",
  "expert_portal": "ತಜ್ಞರ ಪೋರ್ಟಲ್",
  "consult": "ಸಮಾಲೋಚನೆ",
  "admin_panel": "ನಿರ್ವಾಹಕ ಫಲಕ",
  "settings": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
  "logout": "ಲಾಗ್ ಔಟ್"
}"""

hi_overrides = """{
  "financial_ledger": "वित्तीय खाता",
  "operating_expenses": "परिचालन व्यय",
  "gross_revenue": "कुल राजस्व",
  "net_profit_ytd": "शुद्ध लाभ (YTD)",
  "profitability_trend": "लाभप्रदता प्रवृत्ति",
  "transaction_ledger": "लेनदेन खाता",
  "date": "दिनांक",
  "type": "प्रकार",
  "category": "श्रेणी",
  "description": "विवरण",
  "amount": "राशि",
  "action": "कार्रवाई",
  "download_report": "रिपोर्ट डाउनलोड करें",
  "transaction": "लेनदेन",
  "dashboard": "डैशबोर्ड",
  "finance": "वित्त",
  "farm_plots": "खेत के प्लॉट",
  "my_crops": "मेरी फसलें",
  "price_predictor": "मूल्य भविष्यवक्ता",
  "drone_recovery": "ड्रोन रिकवरी",
  "ai_assistant": "एआई सहायक",
  "marketplace": "बाज़ार",
  "expert_portal": "विशेषज्ञ पोर्टल",
  "consult": "परामर्श",
  "admin_panel": "व्यवस्थापक पैनल",
  "settings": "सेटिंग्स",
  "logout": "लॉग आउट"
}"""

# Use regex to completely replace the knTranslation and hiTranslation objects
new_code = re.sub(r'const knTranslation = \{.*?\};', f'const knTranslation = {kn_overrides};', code, flags=re.DOTALL)
new_code = re.sub(r'const hiTranslation = \{.*?\};', f'const hiTranslation = {hi_overrides};', new_code, flags=re.DOTALL)

with open('src/i18n.js', 'w') as f:
    f.write(new_code)
print("Done!")
