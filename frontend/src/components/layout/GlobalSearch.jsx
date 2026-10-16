import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Sparkles, Navigation, Info, ArrowRight, Zap, Target, CreditCard, LayoutDashboard, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const GlobalSearch = () => {
  const { t } = useTranslation();
  

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Handle Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setSuggestions([]);
    }
  }, [isOpen]);

  // Fetch search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      

      if (!query.trim()) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setSuggestions(res.data.suggestions || []);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      if (query.trim().length > 1) {
        fetchSuggestions();
      }
    }, 400);

    return () => clearTimeout(debounce);
  }, [query]);

  const handleAction = (suggestion) => {
    

    setIsOpen(false);
    setQuery('');
    if (suggestion.url && suggestion.url !== '#') {
      navigate(suggestion.url);
    }
  };

  const quickActions = [
    { icon: <Zap size={18} className="text-emerald-500" />, label: 'Run AI Disease Scan', url: '/scan' },
    { icon: <Target size={18} className="text-blue-500" />, label: 'Add New Farm Plot', url: '/farm' },
    { icon: <CreditCard size={18} className="text-purple-500" />, label: 'Upgrade to Pro', url: '/settings' },
    { icon: <LayoutDashboard size={18} className="text-amber-500" />, label: 'View Analytics', url: '/dashboard' },
  ];

  return (
    <>
      {/* Trigger Button in Header */}
      <button 
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-2.5 sm:px-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition w-full max-w-[130px] xs:max-w-[170px] sm:max-w-xs md:w-64 shadow-sm min-w-0"
        aria-label="Open search dialog"
      >
        <Search size={16} className="shrink-0 text-gray-400" />
        <span className="flex-1 text-left truncate">{t("search_dr_agri___")}</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 font-sans text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 shadow-sm font-bold shrink-0">
          <span className="text-xs">⌘</span>{t("k")}</kbd>
      </button>

      {/* Command K Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[8vh] sm:pt-[15vh] px-3 sm:px-4">
            
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm" 
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[70vh]"
            >
              
              {/* Search Input Area */}
              <div className="relative flex items-center px-4 border-b border-gray-100 dark:border-gray-800">
                <Search className="text-gray-400 dark:text-gray-500 w-6 h-6 mr-3" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask Dr Agri AI or search tools..."
                  className="w-full bg-transparent border-none py-5 text-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 focus:outline-none"
                />
                {loading && <Loader2 className="text-emerald-500 w-5 h-5 animate-spin ml-3" />}
                <kbd className="hidden sm:inline-block ml-3 font-sans text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 uppercase font-bold">{t("esc")}</kbd>
              </div>

              {/* Scrollable Results Area */}
              <div className="overflow-y-auto flex-1 p-2">
                
                {/* Default State: Quick Actions */}
                {!query.trim() && (
                  <div className="p-2">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-3">{t("quick_actions")}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {quickActions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAction({ url: action.url })}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                            {action.icon}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{action.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t("go_to")}{action.url}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search Results */}
                {query.trim() && (
                  <div className="p-2">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-3 flex items-center gap-2">
                      <Sparkles size={14} className="text-emerald-500" />{t("ai_results")}</h3>
                    
                    {suggestions.length === 0 && !loading ? (
                      <div className="py-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="text-gray-400 w-8 h-8" />
                        </div>
                        <p className="text-gray-900 dark:text-white font-bold">{t("no_results_found_for")}{query}"</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t("try_searching_for__d")}</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {suggestions.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAction(item)}
                            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-left transition group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                              {item.type === 'nav' ? <Navigation size={18} className="text-blue-500" /> : 
                               item.type === 'action' ? <ArrowRight size={18} className="text-orange-500" /> : 
                               <Info size={18} className="text-emerald-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${item.type === 'info' ? 'font-medium text-gray-700 dark:text-gray-300' : 'font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>
                                {item.label}
                              </p>
                              {item.type !== 'info' && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("jump_to")}{item.url}</p>
                              )}
                            </div>
                            {item.type !== 'info' && (
                              <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1"><kbd className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-sans">↑↓</kbd>{t("to_navigate")}</span>
                  <span className="flex items-center gap-1"><kbd className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 font-sans">{t("enter")}</kbd>{t("to_select")}</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                  <Sparkles size={12} className="text-emerald-500" />{t("powered_by_gemini")}</div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalSearch;
