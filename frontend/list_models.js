import { GoogleGenerativeAI } from '@google/generative-ai';
const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.error("GEMINI_API_KEY environment variable is required.");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  .then(res => res.json())
  .then(data => console.log(data));
