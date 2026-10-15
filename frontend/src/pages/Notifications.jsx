import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from 'react';
import { Bell, CloudRain, Droplets, Bug, TrendingUp, Sprout, Calendar, LifeBuoy, Package, Clock, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { Link } from 'react-router-dom';

const Notifications = () => {
  const { t } = useTranslation();
  

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      

      try {
        const res = await api.get('/notifications/hub');
        setNotifications(res.data);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const getAlertIcon = (type) => {
    

    switch(type) {
      case 'ALERT_WEATHER': return <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400"><CloudRain size={24} /></div>;
      case 'ALERT_IRRIGATION': return <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400"><Droplets size={24} /></div>;
      case 'ALERT_DISEASE': return <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400"><Bug size={24} /></div>;
      case 'ALERT_PRICE': return <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400"><TrendingUp size={24} /></div>;
      case 'ALERT_CROP': return <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><Sprout size={24} /></div>;
      case 'CALENDAR': return <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400"><Calendar size={24} /></div>;
      case 'SUPPORT': return <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center text-pink-600 dark:text-pink-400"><LifeBuoy size={24} /></div>;
      case 'INVENTORY': return <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400"><Package size={24} /></div>;
      default: return <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400"><Bell size={24} /></div>;
    }
  };

  const formatTime = (dateString) => {
    

    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60); // minutes

    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
          <Bell size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("notification_hub")}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t("all_your_farm_alerts")}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="p-8 space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-20 h-full">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={40} className="text-emerald-500 opacity-80" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t("you_re_all_caught_up")}</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">{t("there_are_no_active_")}</p>
            <Link to="/dashboard" className="mt-8 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition">{t("return_to_dashboard")}</Link>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800/60">
            {notifications.map((notif) => (
              <Link 
                key={notif.id}
                to={notif.action_url || '#'} 
                className="flex items-start gap-5 p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group"
              >
                <div className="shrink-0 mt-1 shadow-sm group-hover:scale-110 transition-transform duration-300">
                  {getAlertIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1.5">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      {notif.title}
                    </h3>
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full whitespace-nowrap">
                      <Clock size={12} />
                      {formatTime(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[15px]">
                    {notif.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
