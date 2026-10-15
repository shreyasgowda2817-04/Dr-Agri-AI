const fs = require('fs');

let code = fs.readFileSync('src/i18n.js', 'utf-8');

const enMatch = code.match(/const enTranslation = (\{[\s\S]*?\});/);
const knMatch = code.match(/const knTranslation = (\{[\s\S]*?\});/);
const hiMatch = code.match(/const hiTranslation = (\{[\s\S]*?\});/);

const enDict = JSON.parse(enMatch[1]);
const knDict = JSON.parse(knMatch[1]);
const hiDict = JSON.parse(hiMatch[1]);

for (const key in knDict) {
  if (knDict[key] === enDict[key]) {
    delete knDict[key];
  }
}

for (const key in hiDict) {
  if (hiDict[key] === enDict[key]) {
    delete hiDict[key];
  }
}

code = code.replace(knMatch[1], JSON.stringify(knDict, null, 2));
code = code.replace(hiMatch[1], JSON.stringify(hiDict, null, 2));

fs.writeFileSync('src/i18n.js', code);
console.log("Fixed!");
