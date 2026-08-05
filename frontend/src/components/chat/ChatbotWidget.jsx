import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Mic, Send, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

const ChatbotWidget = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showProactiveBubble, setShowProactiveBubble] = useState(false);
  const [proactiveGreeting, setProactiveGreeting] = useState('');
  const messagesEndRef = useRef(null);

  // Generate proactive insight on mount
  useEffect(() => {
    const generateGreeting = async () => {
      if (!user) {
        setProactiveGreeting("Hello! I am your AI Agriculture Expert. Ask me anything.");
        setMessages([{ text: "Hello! I am your AI Agriculture Expert. Ask me anything.", sender: 'bot' }]);
        setTimeout(() => setShowProactiveBubble(true), 2000);
        return;
      }

      try {
        const [telRes, histRes] = await Promise.all([
          api.get('/iot/telemetry').catch(() => ({ data: null })),
          api.get('/reports/history').catch(() => ({ data: [] }))
        ]);

        const hour = new Date().getHours();
        let timeGreeting = 'Good morning';
        if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
        else if (hour >= 17 && hour < 20) timeGreeting = 'Good evening';
        else if (hour >=20) timeGreeting="Good night"
        
        let greeting = `${timeGreeting}, ${user.name || 'Farmer'}! 👋\n`;
        let hasAlert = false;

        if (telRes.data?.weather_sync && telRes.data.weather_sync !== 'Simulated') {
          if (telRes.data.weather_sync.humidity > 70) {
            greeting += `Humidity is high at ${telRes.data.weather_sync.humidity}%. Fungal risk is elevated. `;
            hasAlert = true;
          } else {
            greeting += `Weather is looking good today! `;
          }
        }

        if (histRes.data?.length > 0) {
          const latest = histRes.data[0];
          if (latest.severity === 'High') {
            greeting += `\nURGENT: Your last scan detected ${latest.disease_name.replace(/___/g, ' ')}. Please apply treatment immediately.`;
            hasAlert = true;
          }
        }

        if (!hasAlert) {
          greeting += `\nYour farm is healthy. How can I assist you today?`;
        }

        setProactiveGreeting(greeting);
        setMessages([{ text: greeting, sender: 'bot' }]);
        
        // Show proactive bubble after 2 seconds if not open
        setTimeout(() => setShowProactiveBubble(true), 2000);
      } catch (e) {
        setMessages([{ text: "Hello! I am your AI Agriculture Expert. Ask me anything.", sender: 'bot' }]);
      }
    };
    generateGreeting();
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text = input) => {
    if (!text.trim()) return;

    // Add user message to chat
    setMessages(prev => [...prev, { text, sender: 'user' }]);
    setInput('');
    
    // Add typing indicator
    setMessages(prev => [...prev, { text: "...", sender: 'bot', isTyping: true }]);

    try {
      // Fetch AI response
      const res = await api.post('/chat/message', {
        message: text,
        language: language
      });
      
      const reply = res.data.reply;
      
      // Replace typing indicator with actual reply
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[newMsgs.length - 1].isTyping) {
          newMsgs.pop();
        }
        return [...newMsgs, { text: reply, sender: 'bot' }];
      });
      
      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speak(reply, language);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => {
        const newMsgs = [...prev];
        if (newMsgs[newMsgs.length - 1].isTyping) {
          newMsgs.pop();
        }
        return [...newMsgs, { text: "Sorry, I am having trouble connecting to my AI brain right now.", sender: 'bot' }];
      });
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition. Please use Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript); // auto-send voice transcript
    };
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const speak = (text, lang) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // cancel any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    
    // Optionally find a specific voice (especially for Hindi/Kannada if available)
    const voices = window.speechSynthesis.getVoices();
    const specificVoice = voices.find(v => v.lang.includes(lang.split('-')[0]));
    if (specificVoice) utterance.voice = specificVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  // Hide widget entirely if on the Agronomy page (which is the full-screen Copilot)
  if (location.pathname.startsWith('/agronomy')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="bg-white w-80 sm:w-96 rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mb-4 flex flex-col h-[500px]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-4 text-white flex justify-between items-center shadow-md">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles size={18} className="text-yellow-300"/>AgriVersion AI </h3>
                <p className="text-xs text-green-100 font-medium">Proactive Farm Intelligence</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    const nextVal = !voiceEnabled;
                    setVoiceEnabled(nextVal);
                    if (!nextVal && window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                    }
                  }} 
                  className="text-green-100 hover:text-white transition"
                  title={voiceEnabled ? "Mute Voice" : "Enable Voice"}
                >
                  {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="text-green-100 hover:text-white transition">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Language Selector */}
            <div className="bg-green-50 p-2 border-b border-green-100 flex justify-center">
              <select 
                className="bg-transparent text-sm font-medium text-green-800 outline-none cursor-pointer"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en-US">English</option>
                <option value="hi-IN">हिंदी (Hindi)</option>
                <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                <option value="te-IN"> Telugu</option>
                <option value="ta-IN">Tamil</option>
              </select>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                  msg.sender === 'user' 
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white self-end rounded-br-none' 
                    : 'bg-white text-gray-800 border border-gray-100 self-start rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
              <button 
                onClick={startListening}
                className={`p-3 rounded-full transition ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
              >
                <Mic size={20} />
              </button>
              <input 
                type="text" 
                className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Type or speak..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={() => handleSend()}
                className="p-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition shadow-sm"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button & Proactive Bubble */}
      {!isOpen && (
        <div className="relative flex flex-col items-end">
          <AnimatePresence>
            {showProactiveBubble && proactiveGreeting && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mb-4 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 max-w-xs relative cursor-pointer"
                onClick={() => { setIsOpen(true); setShowProactiveBubble(false); }}
              >
                <div className="absolute right-2 top-2" onClick={(e) => { e.stopPropagation(); setShowProactiveBubble(false); }}>
                  <X size={14} className="text-gray-400 hover:text-gray-600" />
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded-full text-green-600">
                    <Sparkles size={16} />
                  </div>
                  <p className="text-sm font-medium text-gray-800 line-clamp-3">
                    {proactiveGreeting.split('\n')[0]}<br/>
                    <span className="text-xs text-gray-500">Click to chat...</span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setIsOpen(true); setShowProactiveBubble(false); }}
            className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-4 rounded-full shadow-2xl hover:shadow-green-500/50 transition flex items-center justify-center border-4 border-green-50"
          >
            <MessageCircle size={28} />
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
