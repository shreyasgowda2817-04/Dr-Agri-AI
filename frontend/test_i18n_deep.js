import i18n from './src/i18n.js';
console.log("kn ai_scan directly from resources:", i18n.options.resources.kn.translation.ai_scan);
console.log("kn dashboard directly from resources:", i18n.options.resources.kn.translation.dashboard);
console.log("kn keys:", Object.keys(i18n.options.resources.kn.translation).length);
