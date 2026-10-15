import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI("AIzaSyBOtvBpDMmWs9S6_FwTVQs8r2CndK3A_oI");
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyBOtvBpDMmWs9S6_FwTVQs8r2CndK3A_oI`)
  .then(res => res.json())
  .then(data => console.log(data));
