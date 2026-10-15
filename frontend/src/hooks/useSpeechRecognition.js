import { useState, useCallback, useRef } from 'react';

const useSpeechRecognition = (language = 'en-IN') => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    // Stop any existing recognition just in case
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = language;

    rec.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscriptRef.current + interimTranscript);
    };

    rec.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setError(event.error);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    
    try {
      setError(null);
      setTranscript('');
      finalTranscriptRef.current = '';
      rec.start();
      setIsListening(true);
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  }, [language]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    setTranscript,
    toggleListening,
    startListening,
    stopListening,
    error,
    hasSupport: typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  };
};

export default useSpeechRecognition;
