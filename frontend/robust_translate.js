import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is required.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function run() {
    let code = fs.readFileSync('src/i18n.js', 'utf-8');
    
    // Safely extract dictionaries
    const extractDict = (varName, sourceCode) => {
        const regex = new RegExp(`const ${varName} = (\\{[\\s\\S]*?\\});`);
        const match = sourceCode.match(regex);
        if (!match) return [null, null];
        return [match[0], JSON.parse(match[1])];
    };
    
    let [enStr, enDict] = extractDict('enTranslation', code);
    let [knStr, knDict] = extractDict('knTranslation', code);
    let [hiStr, hiDict] = extractDict('hiTranslation', code);
    
    const keysToTranslate = [];
    const enDictToTranslate = {};
    
    for (const key in enDict) {
        if (!knDict[key] || !hiDict[key]) {
            if (enDict[key].length > 1 && !enDict[key].startsWith('/') && !/^\d+$/.test(enDict[key]) && enDict[key] !== " ") {
                keysToTranslate.push(key);
                enDictToTranslate[key] = enDict[key];
            }
        }
    }
    
    console.log(`Found ${keysToTranslate.length} keys needing translation.`);
    if (keysToTranslate.length === 0) return;
    
    const chunkSize = 150;
    
    for (let i = 0; i < keysToTranslate.length; i += chunkSize) {
        const chunkKeys = keysToTranslate.slice(i, i + chunkSize);
        const chunkDict = {};
        chunkKeys.forEach(k => chunkDict[k] = enDictToTranslate[k]);
        
        const prompt = `
        You are a professional software localization expert.
        Translate the following JSON values from English to Kannada and Hindi.
        Only return a valid JSON object in this exact schema, nothing else (no markdown formatting, no backticks).
        {
            "kn": { "key": "kannada translation" },
            "hi": { "key": "hindi translation" }
        }
        
        Here is the JSON to translate:
        ${JSON.stringify(chunkDict)}
        `;
        
        try {
            const result = await model.generateContent(prompt);
            let text = result.response.text();
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            if (text.indexOf('{') > 0) text = text.substring(text.indexOf('{'));
            if (text.lastIndexOf('}') < text.length - 1) text = text.substring(0, text.lastIndexOf('}') + 1);

            const jsonResult = JSON.parse(text);
            
            if (jsonResult.kn) Object.assign(knDict, jsonResult.kn);
            if (jsonResult.hi) Object.assign(hiDict, jsonResult.hi);
            
            console.log(`Successfully translated chunk ${Math.floor(i/chunkSize) + 1}`);
            
            // Re-extract the LATEST strings from the current code
            [knStr] = extractDict('knTranslation', code);
            [hiStr] = extractDict('hiTranslation', code);

            let newCode = code;
            newCode = newCode.replace(knStr, `const knTranslation = ${JSON.stringify(knDict, null, 2)};`);
            newCode = newCode.replace(hiStr, `const hiTranslation = ${JSON.stringify(hiDict, null, 2)};`);
            fs.writeFileSync('src/i18n.js', newCode);
            code = newCode;
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
            console.error(`Error in chunk ${Math.floor(i/chunkSize) + 1}:`, e.message);
        }
    }
    
    console.log("All translations successfully updated in i18n.js!");
}

run();
