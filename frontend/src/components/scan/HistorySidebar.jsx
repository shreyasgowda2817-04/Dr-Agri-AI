import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import api from '../../services/api';

const HistorySidebar = ({ isOpen, onClose, onSelectHistory }) => {
  const { t } = useTranslation();
  

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    

    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports/history');
      setHistory(res.data);
    } catch (err) {
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Clock className="text-indigo-500" size={24} />{t("scan_history")}</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                  <Loader2 className="animate-spin text-indigo-500" size={32} />
                  <p className="text-sm font-bold">{t("loading_past_scans__")}</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-rose-500 space-y-2">
                  <AlertCircle size={32} />
                  <p className="text-sm font-bold">{error}</p>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                  <Clock size={32} className="opacity-20" />
                  <p className="text-sm font-bold">{t("no_previous_scans_fo")}</p>
                </div>
              ) : (
                history.map((item, idx) => (
                  <motion.div
                    key={item.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      onSelectHistory(item);
                      onClose();
                    }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
                        {new Date(item.created_at || Date.now()).toLocaleDateString()}
                      </p>
                      <h4 className="font-bold text-gray-900 truncate max-w-[200px]">
                        {item.disease_name?.replace(/___/g, ' ') || 'Unknown'}
                      </h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          {item.crop_name}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          item.severity === 'High' ? 'bg-rose-100 text-rose-700' :
                          item.severity === 'Medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {item.severity || 'High'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HistorySidebar;
