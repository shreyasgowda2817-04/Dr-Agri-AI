import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from 'react';
import { CloudRain, Droplets, Bug, TrendingUp, Sprout, Bell, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const SmartFarmAlerts = () => {
  const { t } = useTranslation();
  
  
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get('/notifications/hub');
        // Filter only the ALERT types we just created
        const farmAlerts = res.data.filter(n => n.type.startsWith('ALERT_'));
        setAlerts(farmAlerts);
      } catch (err) {
        console.error("Failed to fetch smart alerts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const getAlertIcon = (type) => {
    switch(type) {
      case 'ALERT_WEATHER': return <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400"><CloudRain size={20} /></div>;
      case 'ALERT_IRRIGATION': return <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400"><Droplets size={20} /></div>;
      case 'ALERT_DISEASE': return <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400"><Bug size={20} /></div>;
      case 'ALERT_PRICE': return <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400"><TrendingUp size={20} /></div>;
      case 'ALERT_CROP': return <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><Sprout size={20} /></div>;
      default: return <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400"><Bell size={20} /></div>;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 w-full animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }


  // Instead of hiding entirely, show an "All clear" state for real SaaS feel
  if (alerts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-8 w-full">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="text-emerald-500" size={20} />{t("smart_farm_alerts")}</h3>
          <Link to="/notifications" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1">{t("view_all")}<ChevronRight size={16} />
          </Link>
        </div>
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
            <Sprout size={32} className="text-emerald-500 opacity-80" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{t("all_clear_")}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">{t("there_are_no_urgent_")}</p>
        </div>
      </div>
    );
  }


  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-8 w-full">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell className="text-emerald-500" size={20} />{t("smart_farm_alerts")}</h3>
        <Link to="/notifications" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1">{t("view_all")}<ChevronRight size={16} />
        </Link>
      </div>

      <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800/60">
        {alerts.slice(0, 5).map((alert) => (
          <Link 
            key={alert.id} 
            to={alert.action_url || '#'}
            className="flex items-start gap-4 p-5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group"
          >
            <div className="shrink-0 mt-0.5 shadow-sm group-hover:scale-110 transition-transform duration-300">
              {getAlertIcon(alert.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1 leading-tight">
                {alert.title}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                {alert.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SmartFarmAlerts;
