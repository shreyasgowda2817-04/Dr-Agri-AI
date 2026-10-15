const fs = require('fs');
const { execSync } = require('child_process');

const keys = execSync('cat missing_keys.txt').toString().split('\n').filter(Boolean);

let fallbackEn = {};
keys.forEach(key => {
  let readable = key.split('_').filter(s => s.length > 0).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  
  // Custom overrides based on screenshot and context
  if (key === 'search_dr_agri___') readable = 'Search Dr Agri...';
  if (key === '____english') readable = 'English';
  if (key === '_________kannada_') readable = 'Kannada';
  if (key === '_________hindi_') readable = 'Hindi';
  if (key === 'dr_agri_ai') readable = 'Dr Agri AI';
  if (key === 'crop_diseaseintelligence') readable = 'Crop Disease Intelligence';
  if (key === 'upload_an_image_of_a') readable = 'Upload an image of a crop to detect diseases instantly.';
  if (key === 'click_to_upload_or_d') readable = 'Click to upload or drag and drop';
  if (key === 'svg__png__jpg_or_gif') readable = 'SVG, PNG, JPG or GIF (max. 5MB)';
  if (key === 'scan_history') readable = 'Scan History';
  if (key === 'good_evening__shreyas') readable = 'Good evening, Shreyas';
  
  fallbackEn[key] = readable;
});

const i18nCode = fs.readFileSync('src/i18n.js', 'utf-8');
const newI18nCode = i18nCode.replace(
  'const enTranslation = {};', 
  `const enTranslation = ${JSON.stringify(fallbackEn, null, 2)};`
);

fs.writeFileSync('src/i18n.js', newI18nCode);
console.log("Fixed translations!", keys.length, "keys added.");
