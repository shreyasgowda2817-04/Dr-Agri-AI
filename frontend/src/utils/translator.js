export const translateText = async (text, targetLangCode) => {
  if (!text || targetLangCode === 'en') return text;
  
  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLangCode}&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await response.json();
    // The API returns an array where the first element is an array of translated segments.
    // e.g. [[["Hola", "Hello", null, null, 1]], null, "en"]
    const translatedText = data[0].map(segment => segment[0]).join('');
    return translatedText;
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Fallback to original text on failure
  }
};

export const translateResultObject = async (result, targetLangCode) => {
  if (!result || targetLangCode === 'en') return result;

  // We only translate strings. We skip confidence_score.
  const translated = { ...result };

  // Translate top level fields
  translated.crop_name = await translateText(result.crop_name, targetLangCode);
  translated.disease_name = await translateText(result.disease_name?.replace(/___/g, ' '), targetLangCode);
  translated.severity = await translateText(result.severity, targetLangCode);

  // Translate treatments
  if (result.recommended_treatment) {
    translated.recommended_treatment = { ...result.recommended_treatment };
    
    if (result.recommended_treatment.organic_remedies) {
      translated.recommended_treatment.organic_remedies = await Promise.all(
        result.recommended_treatment.organic_remedies.map(remedy => translateText(remedy, targetLangCode))
      );
    }
    
    if (result.recommended_treatment.pesticides) {
      translated.recommended_treatment.pesticides = await Promise.all(
        result.recommended_treatment.pesticides.map(pest => translateText(pest, targetLangCode))
      );
    }
  }

  return translated;
};

export const translateUIStrings = async (uiStrings, targetLangCode) => {
  if (targetLangCode === 'en') return uiStrings;
  
  const translated = { ...uiStrings };
  
  // We will run translations in parallel
  const promises = [];
  
  for (const key of Object.keys(translated)) {
    if (typeof translated[key] === 'string') {
      promises.push(
        translateText(translated[key], targetLangCode).then(res => {
          translated[key] = res;
        })
      );
    } else if (Array.isArray(translated[key])) {
      promises.push(
        Promise.all(translated[key].map(text => translateText(text, targetLangCode))).then(res => {
          translated[key] = res;
        })
      );
    }
  }
  
  await Promise.all(promises);
  return translated;
};
