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
    
    // Extract existing dictionaries
    const enMatch = code.match(/const enTranslation = (\{[\s\S]*?\});\nconst knTranslation/);
    let enDict = enMatch ? JSON.parse(enMatch[1]) : {};
    
    const knMatch = code.match(/const knTranslation = (\{[\s\S]*?\});\nconst hiTranslation/);
    let knDict = knMatch ? JSON.parse(knMatch[1]) : {};
    
    const hiMatch = code.match(/const hiTranslation = (\{[\s\S]*?\});\nconst enDashboard/);
    let hiDict = hiMatch ? JSON.parse(hiMatch[1]) : {};
    
    // Identify keys that still need translation
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
            
            if (text.indexOf('{') > 0) {
                text = text.substring(text.indexOf('{'));
            }
            if (text.lastIndexOf('}') < text.length - 1) {
                text = text.substring(0, text.lastIndexOf('}') + 1);
            }

            const jsonResult = JSON.parse(text);
            
            if (jsonResult.kn) {
                for (const k in jsonResult.kn) knDict[k] = jsonResult.kn[k];
            }
            if (jsonResult.hi) {
                for (const k in jsonResult.hi) hiDict[k] = jsonResult.hi[k];
            }
            
            console.log(`Successfully translated chunk ${Math.floor(i/chunkSize) + 1} (${i + chunkKeys.length}/${keysToTranslate.length})`);
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
            console.error(`Error in chunk ${Math.floor(i/chunkSize) + 1}:`, e.message);
        }
    }
    
    if (knMatch) code = code.replace(knMatch[0], `const knTranslation = ${JSON.stringify(knDict, null, 2)};\nconst hiTranslation`);
    if (hiMatch) code = code.replace(hiMatch[0], `const hiTranslation = ${JSON.stringify(hiDict, null, 2)};\nconst enDashboard`);
    
    fs.writeFileSync('src/i18n.js', code);
    console.log("Translations successfully updated in i18n.js!");
}

run();
