import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import useFetchWithCache from '../hooks/useFetchWithCache';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  CloudRain, Activity, IndianRupee, Target, Bell, ArrowRight,
  Zap, Calendar, Package, TrendingUp, AlertTriangle, ShieldCheck, HeartPulse, CheckCircle,
  Sun, CloudSun, Cloud, CloudLightning, Snowflake, CloudFog, CloudDrizzle, Droplets, Wind, MapPin, Thermometer, Umbrella, CloudOff
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SmartFarmAlerts from '../components/dashboard/SmartFarmAlerts';
import PremiumWeatherWidget from '../components/weather/PremiumWeatherWidget';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GovernmentSchemes from '../components/GovernmentSchemes';
import SponsoredAds from '../components/ads/SponsoredAds';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  
  
  // Stale-while-revalidate data fetching (INSTANT load on route return)
  const { data: history, loading: loadingHistory } = useFetchWithCache('/reports/history', []);
  const { data: orders, loading: loadingOrders } = useFetchWithCache('/payments/orders', []);
  const { data: finance, loading: loadingFinance } = useFetchWithCache('/finance/summary', { total_revenue: 0, chart_data: [] });
  const { data: farms, loading: loadingFarms } = useFetchWithCache('/finance/farms', []);

  // Weather & Telemetry State
  const cachedWeather = sessionStorage.getItem('dr_agri_weather');
  const [weather, setWeather] = useState(cachedWeather ? JSON.parse(cachedWeather) : null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(!cachedWeather);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [gpsLocationName, setGpsLocationName] = useState('Detecting area...');

  // {t('health_score')} State (Mock ML)
  const cachedHealth = sessionStorage.getItem('dr_agri_health');
  const [healthScore, setHealthScore] = useState(cachedHealth ? JSON.parse(cachedHealth) : null);
  const [loadingHealth, setLoadingHealth] = useState(!cachedHealth);

  useEffect(() => {
    // Generate {t('health_score')} once per session
    if (!cachedHealth) {
      setTimeout(() => {
        const score = Math.floor(Math.random() * (980 - 750 + 1) + 750);
        const healthObj = {
          score: score,
          details: [
            "+ Optimal crop rotation detected",
            "+ Consistent irrigation schedule",
            "- Minor pest risk in Sector A"
          ]
        };
        setHealthScore(healthObj);
        sessionStorage.setItem('dr_agri_health', JSON.stringify(healthObj));
        setLoadingHealth(false);
      }, 500);
    }

    // Async Weather Fetching
    const fetchWeather = (url) => {
      

      api.get(url).then(res => {
        if (res.data && !res.data.error) {
          setWeather(res.data);
          sessionStorage.setItem('dr_agri_weather', JSON.stringify(res.data));
        }
      }).catch(err => console.error(err))
        .finally(() => setLoadingTelemetry(false));
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsGpsActive(true);
          fetchWeather(`/weather/forecast?lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=en`)
            .then(res => res.json())
            .then(data => {
              if (data && data.address) {
                const locality = data.address.suburb || data.address.neighbourhood || data.address.city_district || data.address.city || data.address.town || data.address.village || 'Current Location';
                setGpsLocationName(locality);
              } else {
                setGpsLocationName('Current Location');
              }
            }).catch(() => setGpsLocationName('Current Location'));
        },
        () => fetchWeather('/weather'),
        { timeout: 5000 }
      );
    } else {
      fetchWeather('/weather');
    }
  }, []);

  const diseasesFound = history?.filter(h => h.disease_name && !h.disease_name.toLowerCase().includes('healthy') && !h.disease_name.toLowerCase().includes('background')).length || 0;

  const dynamicChart = [
    { name: 'Mon', health: 85, risk: 15 },
    { name: 'Tue', health: 88, risk: 12 },
    { name: 'Wed', health: 82, risk: 18 },
    { name: 'Thu', health: 91, risk: 9 },
    { name: 'Fri', health: 86, risk: 14 },
    { name: 'Sat', health: 93, risk: 7 },
    { name: 'Sun', health: healthScore?.score ? Math.round(healthScore.score / 10) : 90, risk: healthScore?.score ? 100 - Math.round(healthScore.score / 10) : 10 }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-2 sm:py-6 overflow-hidden">

      {/* Cinematic Banner Header */}
      <div className="mb-6 sm:mb-8 w-full min-h-[16rem] sm:h-72 md:h-80 rounded-2xl overflow-hidden relative shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
        <img 
          src="/dashboard-banner.jpg" 
          alt="Smart Farm Dashboard Banner" 
          className="absolute inset-0 w-full h-full object-cover object-[center_25%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/85 via-gray-900/30 to-gray-900/90"></div>
        
        {/* Top of Banner: Overview & Button */}
        <div className="relative z-10 p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight drop-shadow-sm">
                {t('overview')}
              </h1>
              {weather?.current && (
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 shadow-sm">
                  {(() => {
                    const code = weather.current.weather_code || 0;
                    if ([0].includes(code)) return <Sun size={15} className="text-amber-400" />;
                    if ([1,2,3].includes(code)) return <CloudSun size={15} className="text-amber-400" />;
                    if ([45,48].includes(code)) return <CloudFog size={15} className="text-gray-300" />;
                    if ([51,53,55,56,57].includes(code)) return <CloudDrizzle size={15} className="text-blue-300" />;
                    if ([61,63,65,66,67,80,81,82].includes(code)) return <CloudRain size={15} className="text-blue-400" />;
                    if ([71,73,75,77,85,86].includes(code)) return <Snowflake size={15} className="text-blue-200" />;
                    if ([95,96,99].includes(code)) return <CloudLightning size={15} className="text-purple-400" />;
                    return <Cloud size={15} className="text-gray-300" />;
                  })()}
                  <span className="text-white font-bold text-xs sm:text-sm">{Math.round(weather.current.temperature_2m)}{t("_c")}</span>
                </div>
              )}
            </div>
            <p className="text-gray-200 text-xs sm:text-sm mt-1 drop-shadow-sm font-medium">
              {t('welcome')} {user?.name}. {t('heres_whats_happening')}
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link to="/scan" className="w-full sm:w-auto justify-center bg-emerald-600 text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg border border-emerald-500/50 backdrop-blur-sm">
              <Zap size={16} />{t("new_ai_scan")}</Link>
          </div>
        </div>

        {/* Bottom of Banner */}
        <div className="relative z-10 p-4 sm:p-6 md:p-8 flex justify-between items-end mt-auto">
          <div className="text-white">
            <p className="text-xs font-bold tracking-wider text-emerald-300 mb-0.5 drop-shadow-md uppercase">{t("dr_agri_1_0")}</p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold drop-shadow-md tracking-tight">{t('live_crop_monitoring')}</h2>
          </div>
        </div>
      </div>

      {/* Proactive Copilot Insight */}
      <div className="mb-6 sm:mb-8 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100/50 dark:border-emerald-800/50 rounded-xl p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-emerald-100 dark:border-gray-700">
          <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 sm:w-5 sm:h-5" />
        </div>
        <div className="w-full min-w-0">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100">{t('ai_intelligence_brief')}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1">
            {loadingTelemetry ? (
              <span className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-48 sm:w-64 block rounded"></span>
            ) : healthScore ? (
              healthScore.score < 700 ? (
                "Crop health has dipped below the 70% threshold. Recommended to schedule an expert drone scan to identify isolated stress factors."
              ) : weather?.current?.relative_humidity_2m > 70 
                ? "High humidity detected in your area. Fungal disease risk is elevated. Consider applying preventive bio-fungicides."
                : t('ai_weather_brief')
            ) : "Fetching intelligence..."}
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard isLoading={loadingHealth} title={t('overall_risk_tier')} value={healthScore?.score >= 750 ? t('prime') : healthScore?.score >= 600 ? "Standard" : "Subprime"} trend={t('b2b_rating')} icon={<Activity className="text-emerald-500" />} />
        <StatCard isLoading={loadingHistory} title={t('disease_alerts')} value={diseasesFound.toString()} trend={diseasesFound > 0 ? t('action_req') : "All Clear"} icon={<AlertTriangle className="text-amber-500" />} isAlert={diseasesFound > 0} />
        <StatCard isLoading={loadingFinance} title={t("total_revenue")} value={`₹${finance?.total_revenue || '0.00'}`} trend={t('real_time')} icon={<IndianRupee className="text-purple-500" />} />
        <StatCard isLoading={loadingFarms} title={t('active_farms')} value={farms.length.toString() || "0"} trend={t('connected')} icon={<Target className="text-blue-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        
        {/* Farm {t('health_score')} Gauge */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm flex flex-col min-w-0">
          <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <HeartPulse size={18} className="text-rose-500" />{t("health_score")}</h2>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            {loadingHealth ? (
              <div className="animate-pulse flex flex-col items-center w-full">
                <div className="w-36 h-36 sm:w-40 sm:h-40 border-[10px] sm:border-[12px] border-gray-200 dark:border-gray-700 rounded-full mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4"></div>
              </div>
            ) : healthScore ? (
              <>
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center rounded-full border-[10px] sm:border-[12px] shadow-inner dark:shadow-black/20 mb-4"
                     style={{ borderColor: healthScore.score >= 750 ? '#10B981' : healthScore.score >= 600 ? '#F59E0B' : '#EF4444' }}>
                  <div className="text-center">
                    <span className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">{healthScore.score}</span>
                    <span className="block text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">{t("out_of_1000")}</span>
                  </div>
                </div>
                
                <div className="w-full mt-2 sm:mt-4 space-y-2">
                  <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t("score_factors")}</p>
                  {healthScore.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm">
                      {detail.includes('+') ? (
                        <CheckCircle size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="text-gray-700 dark:text-gray-300 leading-tight">{detail}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-500 py-10">
                <HeartPulse size={32} className="mb-2 opacity-50" />
                <p className="text-sm">{t("no_health_data_avail")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Analytics Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm min-w-0">
          <div className="flex justify-between items-center mb-4 sm:mb-6 gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">{t('crop_health_index')}</h2>
            <select className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg py-1 px-2.5 sm:py-1.5 sm:px-3 outline-none shrink-0">
              <option>{t("last_7_days")}</option>
              <option>{t("last_30_days")}</option>
            </select>
          </div>
          <div className="h-64 sm:h-72 w-full min-w-0">
            {loadingHistory ? (
              <div className="w-full h-full bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dynamicChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-gray-700" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'rgba(31, 41, 55, 0.9)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)' }}
                    itemStyle={{ color: '#F9FAFB', fontSize: '14px', fontWeight: '500' }}
                  />
                  <Area type="monotone" dataKey="health" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorHealth)" name="Health %" />
                  <Area type="monotone" dataKey="risk" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" name="Risk %" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Premium Animated Weather Widget */}
      {loadingTelemetry ? (
        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm mb-8 min-h-[360px] p-8 flex flex-col justify-between animate-pulse">
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg w-32"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          </div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl w-full"></div>
        </div>
      ) : weather && weather.current ? (
        <PremiumWeatherWidget weather={weather} locationName={isGpsActive ? gpsLocationName : (user?.location || 'Bangalore')} />
      ) : (
        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 flex flex-col items-center justify-center text-center text-gray-500 mb-8">
          <CloudOff size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium">{t("weather_data_not_ava")}</p>
          <p className="text-xs mt-1 opacity-70">{t("please_update_your_l")}</p>
        </div>
      )}

      {/* Sponsored Agricultural Innovations Banner */}
      <SponsoredAds placement="dashboard" layout="banner" className="mb-8" />

      <SmartFarmAlerts />
      <GovernmentSchemes user={user} />

    </div>
  );
};

// Clean UI Components
const StatCard = ({ title, value, trend, icon, isAlert, isLoading }) => (
  <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between hover:shadow-md transition">
    <div className="flex justify-between items-start mb-4">
      <div className="text-gray-500 dark:text-gray-400">{icon}</div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${isAlert ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
        {trend}
      </span>
    </div>
    {isLoading ? (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mt-2"></div>
      </div>
    ) : (
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{title}</p>
      </div>
    )}
  </div>
);



export default Dashboard;
