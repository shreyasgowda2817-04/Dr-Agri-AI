import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share2, Volume2, Save, MessageSquareText, Check } from 'lucide-react';

const ActionPanel = ({ 
  onDownloadPDF, 
  onShare, 
  onListen, 
  onSaveHistory, 
  onAskAI 
}) => {
  const { t } = useTranslation();
  

  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleShareClick = () => {
    

    onShare();
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleListenClick = () => {
    

    setIsSpeaking(true);
    onListen(() => setIsSpeaking(false));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-6 relative"
    >
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-1.5 h-6 bg-indigo-500 rounded-full inline-block"></span>{t("report_actions")}</h3>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button 
          onClick={onDownloadPDF}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition group border border-indigo-100"
        >
          <Download size={22} className="mb-2 group-hover:-translate-y-1 transition" />
          <span className="text-xs font-bold">{t("download")}</span>
        </button>

        <button 
          onClick={handleShareClick}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white transition group border border-emerald-100"
        >
          {copied ? <Check size={22} className="mb-2" /> : <Share2 size={22} className="mb-2 group-hover:rotate-12 transition" />}
          <span className="text-xs font-bold">{copied ? 'Copied!' : 'Share'}</span>
        </button>

        <button 
          onClick={handleListenClick}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl transition group border ${isSpeaking ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white border-amber-100'}`}
        >
          <Volume2 size={22} className={`mb-2 ${isSpeaking ? 'animate-pulse' : 'group-hover:scale-110 transition'}`} />
          <span className="text-xs font-bold">{t("listen")}</span>
        </button>

        <button 
          onClick={onAskAI}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition group border border-blue-100 col-span-2 md:col-span-1"
        >
          <MessageSquareText size={22} className="mb-2 group-hover:-translate-y-1 transition" />
          <span className="text-xs font-bold">{t("ask_ai")}</span>
        </button>
        
        <button 
          onClick={onSaveHistory}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 text-gray-700 hover:bg-gray-800 hover:text-white transition group border border-gray-200 col-span-2 md:col-span-1"
        >
          <Save size={22} className="mb-2 group-hover:scale-110 transition" />
          <span className="text-xs font-bold">{t("save")}</span>
        </button>
      </div>
    </motion.div>
  );
};

export default ActionPanel;
