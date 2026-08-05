import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Droplets, Leaf, Activity, Sprout, Wind, Package, Ticket, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications/hub');
      
      const clearedAt = localStorage.getItem('notificationsClearedAt');
      let filtered = res.data;
      if (clearedAt) {
        const clearTime = new Date(clearedAt).getTime();
        filtered = filtered.filter(n => new Date(n.timestamp).getTime() > clearTime);
      }
      
      setNotifications(filtered);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 2 minutes to keep it updated silently
    const interval = setInterval(fetchNotifications, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (notif, e) => {
    e.stopPropagation();
    
    // If it's a calendar task, we can quick-complete it
    if (notif.type === 'CALENDAR') {
      try {
        await api.put(`/calendar/tasks/${notif.action_id}/complete`);
        toast.success("Task completed!", { icon: "✅" });
        setNotifications(notifications.filter(n => n.id !== notif.id));
      } catch (error) {
        toast.error("Failed to mark task as completed.");
      }
    } else {
      // For others, just navigate to the relevant page and close dropdown
      setIsOpen(false);
      if (notif.action_url) {
        navigate(notif.action_url);
      }
    }
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    setNotifications([]);
    localStorage.setItem('notificationsClearedAt', new Date().toISOString());
    toast.success("All notifications cleared.");
  };

  const getIcon = (type, title) => {
    switch (type) {
      case 'CALENDAR':
        const t = title.toUpperCase();
        if (t.includes('WATER')) return <Droplets size={18} className="text-blue-500" />;
        if (t.includes('FERTILIZER')) return <Leaf size={18} className="text-emerald-500" />;
        if (t.includes('PESTICIDE')) return <Activity size={18} className="text-rose-500" />;
        if (t.includes('PRUNING')) return <Wind size={18} className="text-amber-500" />;
        return <Sprout size={18} className="text-emerald-500" />;
      case 'ORDER':
        return <Package size={18} className="text-indigo-500" />;
      case 'SUPPORT':
        return <Ticket size={18} className="text-purple-500" />;
      case 'INVENTORY':
        return <AlertTriangle size={18} className="text-amber-500" />;
      default:
        return <Bell size={18} className="text-gray-500" />;
    }
  };

  const getIconBg = (type) => {
    switch (type) {
      case 'CALENDAR': return 'bg-blue-50 text-blue-500';
      case 'ORDER': return 'bg-indigo-50 text-indigo-500';
      case 'SUPPORT': return 'bg-purple-50 text-purple-500';
      case 'INVENTORY': return 'bg-amber-50 text-amber-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  const formatTimeAgo = (dateString) => {
    const d = new Date(dateString);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins || 1}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl border border-gray-100 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-600 transition"
      >
        <Bell size={22} />
        <AnimatePresence>
          {notifications.length > 0 && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-sm"
            >
              {notifications.length}
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
          >
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="font-black text-gray-900 dark:text-white">Notification Hub</h3>
                {notifications.length > 0 && (
                  <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2.5 py-1 rounded-full">
                    {notifications.length} Alerts
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="text-xs font-bold text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 font-medium animate-pulse">Loading alerts...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="bg-emerald-50 text-emerald-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Check size={24} />
                  </div>
                  <p className="font-bold text-gray-900 dark:text-white">You're all caught up!</p>
                  <p className="text-sm text-gray-500 mt-1">No alerts or tasks require your attention.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {notifications.map(notif => {
                    return (
                      <div 
                        key={notif.id} 
                        onClick={() => {
                          if (notif.type !== 'CALENDAR') {
                            setIsOpen(false);
                            if (notif.action_url) navigate(notif.action_url);
                          }
                        }}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition group flex gap-4 ${notif.type !== 'CALENDAR' ? 'cursor-pointer' : ''}`}
                      >
                        <div className={`mt-1 p-2 rounded-xl h-max shrink-0 shadow-sm ${getIconBg(notif.type)}`}>
                          {getIcon(notif.type, notif.title)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                              {notif.title}
                            </h4>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 whitespace-nowrap">
                              {formatTimeAgo(notif.timestamp)}
                            </span>
                          </div>
                          {notif.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                              {notif.description}
                            </p>
                          )}
                          
                          {notif.type === 'CALENDAR' && (
                            <button
                              onClick={(e) => handleAction(notif, e)}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                            >
                              <Check size={14} /> Mark Complete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
