const fs = require('fs');

let code = fs.readFileSync('src/i18n.js', 'utf-8');

// 1. Extract enDict
const enMatch = code.match(/const enTranslation = (\{[\s\S]*?\});\nconst knTranslation/);
let enDict = {};
if (enMatch) {
  enDict = JSON.parse(enMatch[1]);
} else {
  // Try another regex if the first failed
  const enMatch2 = code.match(/const enTranslation = (\{[\s\S]*?\});/);
  enDict = JSON.parse(enMatch2[1]);
}

// 2. Define the exact overrides we want for kn and hi
const kn_overrides = {
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
};

const hi_overrides = {
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
};

// 3. Rebuild the file
// Find the index of "const oldTranslations ="
const oldTranslationsIndex = code.indexOf("const oldTranslations = {");

const beforeCode = `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const enTranslation = ${JSON.stringify(enDict, null, 2)};
const knTranslation = ${JSON.stringify(kn_overrides, null, 2)};
const hiTranslation = ${JSON.stringify(hi_overrides, null, 2)};

const enDashboard = {};
const enScan = {};

const knDashboard = {};
const knScan = {};

const hiDashboard = {};
const hiScan = {};

`;

const restOfCode = code.substring(oldTranslationsIndex);

fs.writeFileSync('src/i18n.js', beforeCode + restOfCode);
console.log("i18n.js perfectly rebuilt!");
