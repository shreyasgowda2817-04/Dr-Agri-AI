import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { motion, AnimatePresence, prefersReducedMotion } from 'framer-motion';
import { Send, Bot, User, Sparkles, Sprout, CloudRain, Tractor, ChevronDown, Plus, MessageSquare, Trash2, Menu, Edit2, Check, X, ChartArea, RadioTower } from 'lucide-react';

const SUGGESTIONS = [
  { icon: Sprout, text: "What fertilizer is best for my tomato crop?" },
  { icon: CloudRain, text: "Should I spray pesticide today given the weather?" },
  { icon: Tractor, text: "How can I improve the yield of my 5-acre wheat farm?" },
  {icon:ChartArea, text:"How can i help with price predictor"},
  {icon:RadioTower,text:"What's the Weather now!"}
];

const WELCOME_MSG = { 
  id: 'welcome',
  sender: 'ai', 
  text: "Hello! I am **Dr Agri Copilot**, your elite AI Agronomist.\n\nI have real-time access to your mapped farm plots, soil telemetry, and currently registered crops. How can I help you optimize your yield and farm economics today?" 
};

const Agronomy = () => {
  // State for History
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('agrivision_chat_history');
    if (saved) return JSON.parse(saved);
    return [{ id: Date.now().toString(), title: 'New Chat', messages: [WELCOME_MSG] }];
  });
  
  const [activeSessionId, setActiveSessionId] = useState(() => sessions[0]?.id);
  // Default to hidden so it opens only when hamburger menu is clicked
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en-US');
  
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  
  const chatContainerRef = useRef(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('agrivision_chat_history', JSON.stringify(sessions));
  }, [sessions]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, activeSessionId]);

  const handleNewChat = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [WELCOME_MSG]
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const handleDeleteChat = (id, e) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    if (updated.length === 0) {
      const newSession = { id: Date.now().toString(), title: 'New Chat', messages: [WELCOME_MSG] };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
    } else {
      setSessions(updated);
      if (activeSessionId === id) setActiveSessionId(updated[0].id);
    }
  };

  const handleSaveEdit = (id, e) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitle.trim() } : s));
    }
    setEditingChatId(null);
  };

  const updateActiveSession = (newMessages) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        // Auto-generate title from first user message if it's "New Chat"
        let title = s.title;
        if (title === 'New Chat' && newMessages.length > 1) {
          const firstUserMsg = newMessages.find(m => m.sender === 'user');
          if (firstUserMsg) {
            title = firstUserMsg.text.substring(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
          }
        }
        return { ...s, title, messages: newMessages };
      }
      return s;
    }));
  };

  const handleSend = async (textOverride = null) => {
    const textToSend = typeof textOverride === 'string' ? textOverride : input;
    if (!textToSend.trim()) return;

    const userMsg = { id: Date.now().toString(), sender: 'user', text: textToSend };
    const newMessages = [...messages, userMsg];
    updateActiveSession(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/chat/message', {
        message: textToSend,
        language: language
      });
      
      const aiMsg = { id: (Date.now() + 1).toString(), sender: 'ai', text: response.data.reply };
      updateActiveSession([...newMessages, aiMsg]);
    } catch (error) {
      const errorMsg = { id: (Date.now() + 1).toString(), sender: 'ai', text: "I'm sorry, I'm having trouble connecting to the agronomy engine right now. Please try again later." };
      updateActiveSession([...newMessages, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex h-[calc(100vh-73px)] w-full bg-gray-50 dark:bg-gray-950 transition-colors overflow-hidden relative">
      
      {/* Overlay to close sidebar when clicking outside */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ─── LEFT SIDEBAR (History Drawer) ─── */}
      <div className={`${isSidebarOpen ? 'w-64 md:w-80 border-r translate-x-0' : 'w-0 border-r-0 -translate-x-full'} absolute left-0 top-0 z-30 h-full transition-all duration-300 shrink-0 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden shadow-2xl`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 min-w-[16rem]">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2.5 rounded-xl font-bold hover:scale-[1.02] transition shadow-md"
          >
            <Plus size={18} /> New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 mb-3 mt-2">Chat History</p>
          {sessions.map(session => (
            <div 
              key={session.id}
              onClick={() => {
                setActiveSessionId(session.id);
                setIsSidebarOpen(false); // Close drawer on selection
              }}
              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition group min-w-[14rem] ${
                activeSessionId === session.id 
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden flex-1">
                <MessageSquare size={16} className={activeSessionId === session.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'} />
                
                {editingChatId === session.id ? (
                  <input 
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(session.id, e);
                      if (e.key === 'Escape') setEditingChatId(null);
                    }}
                    autoFocus
                    className="w-full bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-600 text-sm font-medium px-2 py-0.5 rounded outline-none"
                  />
                ) : (
                  <span className={`text-sm truncate font-medium ${activeSessionId === session.id ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-400'}`}>
                    {session.title}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                {editingChatId === session.id ? (
                  <>
                    <button onClick={(e) => handleSaveEdit(session.id, e)} className="p-1 text-emerald-500 hover:text-emerald-600"><Check size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setEditingChatId(null); }} className="p-1 text-gray-400 hover:text-red-500"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingChatId(session.id);
                        setEditTitle(session.title);
                      }}
                      className="p-1 text-gray-400 hover:text-emerald-500 transition"
                      title="Rename Chat"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteChat(session.id, e)}
                      className="p-1 text-gray-400 hover:text-red-500 transition"
                      title="Delete Chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── MAIN CHAT AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 px-6 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 md:border-transparent md:shadow-none"
              title="Show Chat History & New Chat"
            >
              <Menu size={20} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white leading-tight">Dr Agri AI </h1>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hidden sm:block">Context-Aware Agronomy Engine</p>
            </div>
          </div>
          
          <div className="relative group">
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="appearance-none bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold py-2 pl-4 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 transition"
            >
              <option value="en-US">English</option>
              <option value="hi-IN">हिन्दी (Hindi)</option>
              <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
              <option value="te-IN"> Telugu</option>
              <option value="ta-IN">Tamil</option>
              

            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Chat Area */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' 
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                  }`}>
                    {msg.sender === 'user' ? <User size={18} /> : <Bot size={20} />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${
                    msg.sender === 'user'
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-tr-sm'
                      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm'
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                      {renderText(msg.text)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
                  <Bot size={20} />
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-sm font-medium text-gray-500 ml-2">Analyzing farm context...</span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-4 shrink-0">
          <div className="max-w-4xl mx-auto">
            
            {/* Suggestions (Only show if few messages) */}
            {messages.length <= 2 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {SUGGESTIONS.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(sug.text)}
                    className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold px-4 py-2 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 transition"
                  >
                    <sug.icon size={14} /> {sug.text}
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition shadow-inner">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Copilot about crop diseases, fertilizers..."
                className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-500 text-[15px] outline-none py-2.5 px-3"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 hover:bg-emerald-600 disabled:opacity-50 disabled:bg-gray-300 dark:disabled:bg-gray-700 transition shadow-md"
              >
                <Send size={18} className={input.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
              </button>
            </div>
            <p className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-600 mt-3 uppercase tracking-wider">
              Dr Agri AI can make mistakes. Consider verifying important agronomic decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agronomy;
