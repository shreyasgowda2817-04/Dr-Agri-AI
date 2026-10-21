import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is required.");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-3.7-flash" });

async function run() {
    let code = fs.readFileSync('src/i18n.js', 'utf-8');
    const enMatch = code.match(/const enTranslation = (\{[\s\S]*?\});/);
    if (!enMatch) {
        console.error("enTranslation not found");
        process.exit(1);
    }
    
    const enDict = JSON.parse(enMatch[1]);
    const keys = Object.keys(enDict);
    const values = Object.values(enDict);
    const chunkSize = 200;
    
    let knDict = {};
    let hiDict = {};
    
    for (let i = 0; i < keys.length; i += chunkSize) {
        const chunkKeys = keys.slice(i, i + chunkSize);
        const chunkDict = {};
        chunkKeys.forEach(k => chunkDict[k] = enDict[k]);
        
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
            const jsonResult = JSON.parse(text);
            
            Object.assign(knDict, jsonResult.kn || {});
            Object.assign(hiDict, jsonResult.hi || {});
            console.log(`Successfully translated chunk ${Math.floor(i/chunkSize) + 1}`);
        } catch (e) {
            console.error(`Error in chunk ${Math.floor(i/chunkSize) + 1}:`, e);
            chunkKeys.forEach(k => {
                if (!knDict[k]) knDict[k] = enDict[k];
                if (!hiDict[k]) hiDict[k] = enDict[k];
            });
        }
    }
    
    let newCode = code.replace("const knTranslation = {};", `const knTranslation = ${JSON.stringify(knDict, null, 2)};`);
    newCode = newCode.replace("const hiTranslation = {};", `const hiTranslation = ${JSON.stringify(hiDict, null, 2)};`);
    
    fs.writeFileSync('src/i18n.js', newCode);
    console.log("Translations generated successfully!");
}

run();
