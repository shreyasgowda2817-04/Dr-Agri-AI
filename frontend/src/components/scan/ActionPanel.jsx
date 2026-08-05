import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, Languages, Volume2, Save, MessageSquareText, Check, X, Send, History } from 'lucide-react';

const ActionPanel = ({ 
  onDownloadPDF, 
  onShare, 
  onListen, 
  onTranslate, 
  onSaveHistory, 
  onAskAI 
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState('English');

  const handleShareClick = () => {
    onShare();
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleListenClick = () => {
    setIsSpeaking(true);
    onListen(() => setIsSpeaking(false));
  };

  const handleTranslateClick = () => {
    setShowTranslateModal(true);
  };

  const languageMap = {
    'English': 'en',
    'Hindi (हिंदी)': 'hi',
    'Kannada (ಕನ್ನಡ)': 'kn',
    'Telugu (తెలుగు)': 'te',
    'Tamil (தமிழ்)': 'ta',
    'Marathi (मराठी)': 'mr',
    'Bengali (বাংলা)': 'bn'
  };

  const selectLanguage = async (lang) => {
    setShowTranslateModal(false);
    setActiveLanguage(lang);
    const code = languageMap[lang];
    if (code) {
      await onTranslate(code);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-6 relative"
    >
      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
        Actions & Integrations {activeLanguage !== 'English' && <span className="text-indigo-500 ml-2">({activeLanguage})</span>}
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <button 
          onClick={onDownloadPDF}
          className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-emerald-50 text-gray-600 hover:text-emerald-700 rounded-2xl transition group border border-transparent hover:border-emerald-100"
        >
          <Download size={24} className="mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold">PDF Report</span>
        </button>

        <button 
          onClick={handleShareClick}
          className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-700 rounded-2xl transition group border border-transparent hover:border-blue-100 relative"
        >
          {copied ? (
            <Check size={24} className="mb-2 text-green-500" />
          ) : (
            <Share2 size={24} className="mb-2 group-hover:scale-110 transition-transform" />
          )}
          <span className="text-xs font-bold">{copied ? 'Copied Link' : 'Share Link'}</span>
        </button>

        <button 
          onClick={handleTranslateClick}
          className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 rounded-2xl transition group border border-transparent hover:border-indigo-100"
        >
          <Languages size={24} className="mb-2 transition-transform group-hover:scale-110" />
          <span className="text-xs font-bold">Translate</span>
        </button>

        <button 
          onClick={handleListenClick}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl transition group border 
            ${isSpeaking 
              ? 'bg-amber-100 border-amber-200 text-amber-700' 
              : 'bg-gray-50 hover:bg-amber-50 border-transparent hover:border-amber-100 text-gray-600 hover:text-amber-700'}`}
        >
          <Volume2 size={24} className={`mb-2 transition-transform ${isSpeaking ? 'animate-pulse' : 'group-hover:scale-110'}`} />
          <span className="text-xs font-bold">{isSpeaking ? 'Playing...' : 'Play Audio'}</span>
        </button>

        <button 
          onClick={onSaveHistory}
          className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-700 rounded-2xl transition group border border-transparent hover:border-rose-100"
        >
          <History size={24} className="mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold">View History</span>
        </button>

        <button 
          onClick={onAskAI}
          className="flex flex-col items-center justify-center p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition shadow-lg shadow-indigo-200 group"
        >
          <MessageSquareText size={24} className="mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold">Ask AI Copilot</span>
        </button>
      </div>

      {/* Translation Modal Overlay */}
      <AnimatePresence>
        {showTranslateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 rounded-3xl flex items-center justify-center p-6"
          >
            <div className="bg-white shadow-2xl border border-gray-100 rounded-2xl p-6 w-full max-w-sm relative">
              <button 
                onClick={() => setShowTranslateModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
              >
                <X size={20} />
              </button>
              <h4 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <Languages className="text-indigo-500" /> Select Language
              </h4>
              <div className="space-y-2">
                {['English', 'Hindi (हिंदी)', 'Kannada (ಕನ್ನಡ)', 'Telugu (తెలుగు)', 'Tamil (தமிழ்)', 'Marathi (मराठी)', 'Bengali (বাংলা)'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => selectLanguage(lang)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 font-bold text-gray-700 transition"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ActionPanel;
