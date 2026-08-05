import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { motion } from 'framer-motion';
import { 
  CloudRain, Activity, IndianRupee, Target, Bell, ArrowRight,
  Zap, Calendar, Package, TrendingUp, AlertTriangle, ShieldCheck, HeartPulse, CheckCircle,
  Sun, CloudSun, Cloud, CloudLightning, Snowflake, CloudFog, CloudDrizzle, Droplets, Wind, MapPin, Thermometer, Umbrella
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  
  // Data States
  const [history, setHistory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [weather, setWeather] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [finance, setFinance] = useState(null);
  const [farms, setFarms] = useState([]);
  const [healthScore, setHealthScore] = useState(null);

  // Progressive Loading States
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [loadingFinance, setLoadingFinance] = useState(true);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [gpsLocationName, setGpsLocationName] = useState('Detecting area...');

  useEffect(() => {
    // 1. Fetch History
    api.get('/reports/history').then(res => {
      setHistory(res.data || []);
    }).catch(err => {
      console.error(err);
      setHistory([]);
    }).finally(() => setLoadingHistory(false));

    // 2. Fetch Orders
    api.get('/payments/orders').then(res => {
      setOrders(res.data || []);
    }).catch(err => {
      console.error(err);
      setOrders([]);
    }).finally(() => setLoadingOrders(false));

    // 3. Fetch Real Weather Data (GPS Priority)
    const fetchWeather = (url) => {
      api.get(url).then(res => {
        if (res.data && !res.data.error) setWeather(res.data);
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
            })
            .catch(() => setGpsLocationName('Current Location'));
        },
        (error) => {
          console.warn("Geolocation denied/failed, falling back to profile:", error);
          setIsGpsActive(false);
          fetchWeather(`/weather/forecast?city=${encodeURIComponent(user?.location || 'Bangalore')}`);
        },
        { timeout: 7000 }
      );
    } else {
      setIsGpsActive(false);
      fetchWeather(`/weather/forecast?city=${encodeURIComponent(user?.location || 'Bangalore')}`);
    }

    // 4. Fetch Finance
    api.get('/finance/summary').then(res => {
      if (res.data) setFinance(res.data);
    }).catch(err => console.error(err))
      .finally(() => setLoadingFinance(false));

    // 5. Fetch Farms
    api.get('/finance/farms').then(res => {
      if (res.data) setFarms(res.data);
    }).catch(err => console.error(err))
      .finally(() => setLoadingFarms(false));

    // 6. Fetch Health Score
    api.get('/health-score').then(res => {
      if (res.data) setHealthScore(res.data);
    }).catch(err => console.error(err))
      .finally(() => setLoadingHealth(false));

  }, [user?.location]);

  // --- Derived State (Computed dynamically from loaded states) ---
  const totalScans = history.length;
  const diseasesFound = history.filter(h => h.disease_name && !h.disease_name.toLowerCase().includes('healthy')).length;

  // Chart
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  let dynamicChart = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayName = days[d.getDay()];
    const dateStr = d.toISOString().split('T')[0];
    
    let baseHealth = 95;
    let risk = 5;
    
    history.forEach(h => {
      if (h.created_at && h.created_at.startsWith(dateStr)) {
        if (h.severity === 'High') {
          baseHealth -= 15;
          risk += 15;
        } else if (h.severity === 'Medium') {
          baseHealth -= 5;
          risk += 5;
        }
      }
    });
    dynamicChart.push({ name: dayName, health: Math.max(0, baseHealth), risk: Math.min(100, risk) });
  }

  // Tasks
  let dynamicTasks = [];
  history.filter(h => h.severity === 'High').slice(0, 1).forEach(h => {
    dynamicTasks.push({ title: `Treat ${h.disease_name.replace(/___/g, ' ')}`, time: "ASAP", type: "urgent" });
  });
  if (telemetry?.sensors?.[0]?.moisture_percent > 40) {
    dynamicTasks.push({ title: "Delay watering, high moisture", time: "Today", type: "ai" });
  }
  if (farms.length > 0) {
    dynamicTasks.push({ title: `Inspect ${farms[0].name}`, time: "Morning", type: "routine" });
  }
  if (dynamicTasks.length === 0) dynamicTasks.push({ title: "Scan crops with AI", time: "Anytime", type: "ai" });

  // Inventory
  let dynamicInventory = [];
  const recentOrders = orders.filter(o => o.status === 'paid').slice(0, 3);
  if (recentOrders.length > 0) {
    recentOrders.forEach((o, idx) => {
      dynamicInventory.push({ name: o.product_name, level: 100 - (idx * 20), status: "good" });
    });
  } else {
    dynamicInventory = [
      { name: "Organic Fungicide", level: 15, status: "low" },
      { name: "NPK Fertilizer", level: 60, status: "good" }
    ];
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 overflow-x-hidden">
      
      {/* Cinematic Banner Header */}
      <div className="mb-8 w-full h-64 md:h-80 rounded-2xl overflow-hidden relative shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
        <img 
          src="/dashboard-banner.jpg" 
          alt="Smart Farm Dashboard Banner" 
          className="absolute inset-0 w-full h-full object-cover object-[center_25%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/20 to-gray-900/80"></div>
        
        {/* Top of Banner: Overview & Button */}
        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-sm">
              Overview
            </h1>
            <p className="text-gray-200 text-sm mt-1 drop-shadow-sm font-medium">
              Welcome {user?.name}. Here's what's happening today.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/scan" className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition flex items-center gap-2 shadow-lg border border-emerald-500/50 backdrop-blur-sm">
              <Zap size={16} /> New AI Scan
            </Link>
          </div>
        </div>

        {/* Bottom of Banner */}
        <div className="relative z-10 p-6 md:p-8 flex justify-between items-end mt-auto">
          <div className="text-white">
            <p className="text-sm font-bold tracking-wider text-emerald-300 mb-1 drop-shadow-md uppercase">Dr Agri 1.0</p>
            <h2 className="text-2xl md:text-3xl font-semibold drop-shadow-md tracking-tight">Live Crop Monitoring</h2>
          </div>
        </div>
      </div>

      {/* Proactive Copilot Insight */} 
      <div className="mb-8 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100/50 dark:border-emerald-800/50 rounded-xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-emerald-100 dark:border-gray-700">
          <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="w-full">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">AI Intelligence Brief</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {loadingTelemetry ? (
              <span className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-64 block rounded"></span>
            ) : healthScore ? (
              healthScore.score < 700 ? (
                "Crop health has dipped below the 70% threshold. Recommended to schedule an expert drone scan to identify isolated stress factors."
              ) : weather?.current?.relative_humidity_2m > 70 
                ? "High humidity detected in your area. Fungal disease risk is elevated. Consider applying preventive bio-fungicides."
                : "Weather conditions are optimal. Expected crop yield is trending upwards by 12%. No immediate threats detected."
            ) : "Fetching intelligence..."}
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard isLoading={loadingHealth} title="Overall Risk Tier" value={healthScore?.score >= 750 ? "Prime" : healthScore?.score >= 600 ? "Standard" : "Subprime"} trend="B2B Rating" icon={<Activity className="text-emerald-500" />} />
        <StatCard isLoading={loadingHistory} title="Disease Alerts" value={diseasesFound.toString()} trend={diseasesFound > 0 ? "Action Req" : "All Clear"} icon={<AlertTriangle className="text-amber-500" />} isAlert={diseasesFound > 0} />
        <StatCard isLoading={loadingFinance} title="Total Revenue" value={`₹${finance?.total_revenue || '0.00'}`} trend="Real-time" icon={<IndianRupee className="text-purple-500" />} />
        <StatCard isLoading={loadingFarms} title="Active Farms" value={farms.length.toString() || "0"} trend="Connected" icon={<Target className="text-blue-500" />} />
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        
        {/* Farm Health Score Gauge */}
        <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm flex flex-col">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <HeartPulse size={18} className="text-rose-500" />Health Score
          </h2>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            {loadingHealth ? (
              <div className="animate-pulse flex flex-col items-center w-full">
                <div className="w-40 h-40 border-[12px] border-gray-200 dark:border-gray-700 rounded-full mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4"></div>
              </div>
            ) : healthScore ? (
              <>
                <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-[12px] shadow-inner dark:shadow-black/20 mb-4"
                     style={{ borderColor: healthScore.score >= 750 ? '#10B981' : healthScore.score >= 600 ? '#F59E0B' : '#EF4444' }}>
                  <div className="text-center">
                    <span className="text-4xl font-black text-gray-900 dark:text-white">{healthScore.score}</span>
                    <span className="block text-xs font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wider">out of 1000</span>
                  </div>
                </div>
                
                <div className="w-full mt-4 space-y-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Score Factors</p>
                  {healthScore.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      {detail.includes('+') ? (
                        <CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                      )}
                      <span className="text-gray-700 dark:text-gray-300 leading-tight">{detail}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-gray-500 py-10">
                <HeartPulse size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No health data available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Analytics Chart */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Crop Health Index</h2>
            <select className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg py-1.5 px-3 outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-72 w-full">
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

      {/* Full-Width Weather Intelligence Banner */}
      <div className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm mb-8">
        {loadingTelemetry ? (
          <div className="p-6 flex flex-col space-y-4 animate-pulse pt-4">
             <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
             <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
             <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4"></div>
          </div>
        ) : weather && weather.current ? (
          <div className="flex flex-col lg:flex-row">
            
            {/* LEFT COLUMN: Current & Hourly & Telemetry */}
            <div className="flex-1 flex flex-col relative min-w-0">
              {/* Dynamic Gradient Header (Google Style) */}
              <div className={`p-8 lg:p-10 flex flex-col justify-between text-white ${
                [0,1].includes(weather.current.weather_code) ? (weather.current.is_day ? 'bg-gradient-to-b from-blue-400 to-sky-300' : 'bg-gradient-to-b from-indigo-900 to-slate-800') :
                [2,3].includes(weather.current.weather_code) ? 'bg-gradient-to-b from-slate-400 to-gray-300' :
                [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(weather.current.weather_code) ? 'bg-gradient-to-b from-slate-600 to-slate-400' :
                'bg-gradient-to-b from-blue-400 to-sky-300'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-8xl font-normal tracking-tighter flex items-start gap-1">
                      {Math.round(weather.current.temperature_2m)}<span className="text-4xl mt-2 font-light">°</span>
                    </h3>
                    <p className="text-white/90 text-lg mt-2 font-medium capitalize">
                      {
                        [0].includes(weather.current.weather_code) ? 'Clear' :
                        [1,2,3].includes(weather.current.weather_code) ? 'Partly Cloudy' :
                        [45,48].includes(weather.current.weather_code) ? 'Fog' :
                        [51,53,55,56,57].includes(weather.current.weather_code) ? 'Light Rain' :
                        [61,63,65,66,67,80,81,82].includes(weather.current.weather_code) ? 'Rain' :
                        [71,73,75,77,85,86].includes(weather.current.weather_code) ? 'Snow' :
                        [95,96,99].includes(weather.current.weather_code) ? 'Thunderstorm' : 'Cloudy'
                      }
                    </p>
                    <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
                      {isGpsActive && <MapPin size={12} />}
                      {isGpsActive ? gpsLocationName : (user?.location || 'Bangalore')}
                    </p>
                  </div>
                  <div>
                    {
                      [0].includes(weather.current.weather_code) ? (weather.current.is_day ? <Sun size={96} className="text-amber-300 drop-shadow-lg" /> : <Sun size={96} className="text-indigo-200 drop-shadow-lg" />) :
                      [1,2,3].includes(weather.current.weather_code) ? <CloudSun size={96} className="text-gray-100 drop-shadow-lg" /> :
                      [45,48].includes(weather.current.weather_code) ? <CloudFog size={96} className="text-gray-200 drop-shadow-lg" /> :
                      [51,53,55,56,57].includes(weather.current.weather_code) ? <CloudDrizzle size={96} className="text-blue-100 drop-shadow-lg" /> :
                      [61,63,65,66,67,80,81,82].includes(weather.current.weather_code) ? <CloudRain size={96} className="text-blue-200 drop-shadow-lg" /> :
                      [71,73,75,77,85,86].includes(weather.current.weather_code) ? <Snowflake size={96} className="text-white drop-shadow-lg" /> :
                      [95,96,99].includes(weather.current.weather_code) ? <CloudLightning size={96} className="text-purple-200 drop-shadow-lg" /> : <Cloud size={96} className="text-gray-200 drop-shadow-lg" />
                    }
                  </div>
                </div>
              </div>

              <div className="p-6 lg:p-8 flex-1 flex flex-col justify-between min-w-0">
                
                {/* Hourly Forecast (Google Pills) */}
                <div className="mb-8 min-w-0">
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3 pb-4">
                    {weather.hourly?.time.slice(new Date().getHours(), new Date().getHours() + 8).map((time, idx) => {
                      const code = weather.hourly.weather_code[new Date().getHours() + idx];
                      const temp = Math.round(weather.hourly.temperature_2m[new Date().getHours() + idx]);
                      const hourStr = new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
                      const isNow = idx === 0;
                      
                      return (
                        <div key={idx} className={`flex flex-col items-center justify-center rounded-full py-4 px-2 border ${isNow ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800' : 'bg-transparent border-gray-100 dark:border-gray-800'}`}>
                          <span className={`text-xs font-medium mb-3 ${isNow ? 'text-blue-700 dark:text-blue-400' : 'text-gray-500'}`}>{isNow ? 'Now' : hourStr}</span>
                          <span className="mb-3">
                            {
                              [0].includes(code) ? <Sun size={24} className="text-amber-500" /> :
                              [1,2,3].includes(code) ? <CloudSun size={24} className="text-amber-500" /> :
                              [45,48].includes(code) ? <CloudFog size={24} className="text-gray-400" /> :
                              [51,53,55,56,57].includes(code) ? <CloudDrizzle size={24} className="text-blue-400" /> :
                              [61,63,65,66,67,80,81,82].includes(code) ? <CloudRain size={24} className="text-blue-500" /> :
                              [71,73,75,77,85,86].includes(code) ? <Snowflake size={24} className="text-blue-300" /> :
                              [95,96,99].includes(code) ? <CloudLightning size={24} className="text-purple-500" /> : <Cloud size={24} className="text-gray-400" />
                            }
                          </span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{temp}°</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4-Grid Telemetry (Google style rounded rects) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl flex flex-col gap-2">
                    <Droplets size={20} className="text-blue-500" />
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{weather.current.relative_humidity_2m}%</p>
                    <p className="text-xs text-gray-500 font-medium">Humidity</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl flex flex-col gap-2">
                    <Wind size={20} className="text-teal-500" />
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{weather.current.wind_speed_10m} km/h</p>
                    <p className="text-xs text-gray-500 font-medium">Wind</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl flex flex-col gap-2">
                    <Thermometer size={20} className="text-amber-500" />
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{Math.round(weather.current.apparent_temperature)}°</p>
                    <p className="text-xs text-gray-500 font-medium">Feels Like</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl flex flex-col gap-2">
                    <Umbrella size={20} className="text-indigo-500" />
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{weather.daily?.precipitation_probability_max?.[0] || 0}%</p>
                    <p className="text-xs text-gray-500 font-medium">Rain Chance</p>
                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT COLUMN: 10-Day Vertical Forecast (Google Style) */}
            <div className="lg:w-96 bg-gray-50 dark:bg-gray-900/40 border-l border-gray-100 dark:border-gray-800 p-6 lg:p-8 flex flex-col">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-6">10-Day Forecast</h4>
              <div className="space-y-5">
                {weather.daily?.time.slice(0, 10).map((date, idx) => {
                  const code = weather.daily.weather_code[idx];
                  const max = Math.round(weather.daily.temperature_2m_max[idx]);
                  const min = Math.round(weather.daily.temperature_2m_min[idx]);
                  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
                  const isToday = idx === 0;
                  
                  return (
                    <div key={idx} className="flex items-center justify-between group">
                      <span className={`w-14 font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>{isToday ? 'Today' : dayName}</span>
                      <span className="w-8 flex justify-center text-gray-400">
                        {
                          [0].includes(code) ? <Sun size={20} className="text-amber-500" /> :
                          [1,2,3].includes(code) ? <CloudSun size={20} className="text-amber-500" /> :
                          [45,48].includes(code) ? <CloudFog size={20} className="text-gray-400" /> :
                          [51,53,55,56,57].includes(code) ? <CloudDrizzle size={20} className="text-blue-400" /> :
                          [61,63,65,66,67,80,81,82].includes(code) ? <CloudRain size={20} className="text-blue-500" /> :
                          [71,73,75,77,85,86].includes(code) ? <Snowflake size={20} className="text-blue-300" /> :
                          [95,96,99].includes(code) ? <CloudLightning size={20} className="text-purple-500" /> : <Cloud size={20} className="text-gray-400" />
                        }
                      </span>
                      <div className="flex flex-1 items-center gap-3 justify-end ml-4">
                        <span className="text-sm text-gray-500 font-medium w-6 text-right">{min}°</span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden relative min-w-[60px]">
                          <div 
                            className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-teal-400 to-amber-400"
                            style={{ 
                              left: `${Math.max(0, (min - 10) / 30 * 100)}%`, 
                              right: `${Math.max(0, 100 - ((max - 10) / 30 * 100))}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white font-bold w-6 text-left">{max}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-10">
            <CloudRain size={48} className="opacity-20 mb-4" />
            <p className="text-sm font-medium">Weather data not available.</p>
            <p className="text-xs mt-1">Please update your location.</p>
          </div>
        )}
      </div>

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
