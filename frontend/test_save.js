import fs from 'fs';
let code = fs.readFileSync('src/i18n.js', 'utf-8');
const knMatch = code.match(/const knTranslation = (\{[\s\S]*?\});\nconst hiTranslation/);
const hiMatch = code.match(/const hiTranslation = (\{[\s\S]*?\});\nconst enDashboard/);

let knDict = JSON.parse(knMatch[1]);
let hiDict = JSON.parse(hiMatch[1]);

knDict["TEST_KEY"] = "This is a test";
hiDict["TEST_KEY"] = "This is a test";

if (knMatch) code = code.replace(knMatch[0], `const knTranslation = ${JSON.stringify(knDict, null, 2)};\nconst hiTranslation`);
// Re-match hiMatch because string length changed!
const hiMatch2 = code.match(/const hiTranslation = (\{[\s\S]*?\});\nconst enDashboard/);
if (hiMatch2) code = code.replace(hiMatch2[0], `const hiTranslation = ${JSON.stringify(hiDict, null, 2)};\nconst enDashboard`);

fs.writeFileSync('src/i18n.js', code);
console.log("Saved TEST_KEY");
