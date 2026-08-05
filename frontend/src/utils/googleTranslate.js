export const initGoogleTranslate = () => {
  if (!document.getElementById('google-translate-script')) {
    // Add the hidden div for the widget
    const widgetDiv = document.createElement('div');
    widgetDiv.id = 'google_translate_element';
    widgetDiv.style.display = 'none'; // Completely hide the default widget
    document.body.appendChild(widgetDiv);

    // Add the script
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.type = 'text/javascript';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    
    window.googleTranslateElementInit = function() {
      new window.google.translate.TranslateElement(
        {pageLanguage: 'en', layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE},
        'google_translate_element'
      );
    };
    
    document.body.appendChild(script);
  }
};

export const triggerTranslation = (langCode) => {
  // Set Google Translate cookie so it persists across reloads natively
  document.cookie = `googtrans=/en/${langCode}; path=/`;
  document.cookie = `googtrans=/en/${langCode}; domain=${window.location.hostname}; path=/`;

  let attempts = 0;
  const tryTranslate = () => {
    const selectElement = document.querySelector('.goog-te-combo');
    if (selectElement) {
      selectElement.value = langCode;
      selectElement.dispatchEvent(new Event('change')); // Trigger Google Translate's listener
    } else {
      attempts++;
      if (attempts < 15) {
        setTimeout(tryTranslate, 500); // Poll every 500ms for up to 7.5 seconds
      } else {
        console.warn("Google Translate widget took too long to load or is blocked.");
      }
    }
  };
  
  tryTranslate();
};
