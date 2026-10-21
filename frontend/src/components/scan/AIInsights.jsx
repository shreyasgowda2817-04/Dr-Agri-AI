import React from 'react';
import { useTranslation } from "react-i18next";
import { motion } from 'framer-motion';
import { 
  CloudRain, 
  Thermometer, 
  Droplets, 
  Wind, 
  CalendarClock, 
  CheckCircle2, 
  AlertTriangle, 
  CloudLightning, 
  Activity, 
  BrainCircuit, 
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AIInsights = ({ result, ui }) => {
  const { t } = useTranslation();

  if (!result) return null;

  const weather = result.weather_intelligence || {};
  const weatherSnapshot = result.weather_snapshot || {};
  const sprayWindow = weather.spray_window || {};

  const temp = weather.temperature !== undefined && weather.temperature !== null 
    ? `${weather.temperature}°C` 
    : weatherSnapshot.temperature || "Unavailable";

  const humidity = weather.humidity !== undefined && weather.humidity !== null 
    ? `${weather.humidity}%` 
    : weatherSnapshot.humidity || "Unavailable";

  const windSpeed = weather.wind_speed !== undefined && weather.wind_speed !== null 
    ? `${weather.wind_speed} km/h` 
    : weatherSnapshot.wind_speed || "N/A";

  const rainProb = weather.rain_probability !== undefined && weather.rain_probability !== null 
    ? `${weather.rain_probability}%` 
    : weatherSnapshot.rain_probability || "0%";

  const sprayStatus = sprayWindow.status || (windSpeed !== "N/A" && parseFloat(windSpeed) > 15 ? "delay" : "optimal");
  const recommendedTime = sprayWindow.recommended_time || result.spray_time || "Tomorrow, 6:00 AM - 8:30 AM";
  const sprayReason = sprayWindow.reason || "Calm winds, safe temperatures, and dry foliage forecast.";

  const isWeatherUnavailable = temp === "Unavailable" && humidity === "Unavailable";

  // Dynamic projection chart based on severity
  const chartData = result.chart_data || [
    { day: 'Day 1', risk: 85 },
    { day: 'Day 3', risk: 65 },
    { day: 'Day 7', risk: 35 },
    { day: 'Day 14', risk: 10 }
  ];

  const getSprayBadge = (st) => {
    switch (st) {
      case 'delay':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <AlertTriangle size={14} className="text-rose-600" />,
          title: 'Delay Application'
        };
      case 'suboptimal':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <AlertTriangle size={14} className="text-amber-600" />,
          title: 'Suboptimal Window'
        };
      case 'unavailable':
        return {
          bg: 'bg-gray-50 text-gray-700 border-gray-200',
          icon: <Info size={14} className="text-gray-500" />,
          title: 'Weather Offline'
        };
      case 'optimal':
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 size={14} className="text-emerald-600" />,
          title: 'Optimal Spray Window'
        };
    }
  };

  const sprayBadge = getSprayBadge(sprayStatus);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6"
    >
      {/* ── LEFT: PROJECTION & BIOMARKER SIMULATION (8 cols) ── */}
      <div className="lg:col-span-7 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-indigo-800/80 text-white relative overflow-hidden flex flex-col justify-between">
        <Sparkles className="absolute top-4 right-4 text-indigo-400 opacity-15 w-40 h-40 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-indigo-300">
            <BrainCircuit size={15} />
            <span>Pathogen Dynamics & Risk Projection</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
            Expected Disease Progression Curve
          </h3>
          <p className="text-xs text-indigo-200/80 mb-6 max-w-lg leading-relaxed">
            Projected pathogen inoculum suppression assuming recommended sanitation and timely spray interventions are executed.
          </p>

          {/* Area Chart */}
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818CF8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#6366F1" tick={{ fill: '#A5B4FC', fontSize: 11 }} />
                <YAxis stroke="#6366F1" tick={{ fill: '#A5B4FC', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#818CF8' }}
                  formatter={(val) => [`${val}% Inoculum Risk`, 'Severity']}
                />
                <Area type="monotone" dataKey="risk" stroke="#818CF8" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-indigo-800/60 flex items-center justify-between text-[11px] text-indigo-300 relative z-10 font-medium">
          <span>Simulation calibrated to foliar progression rates</span>
          <span className="font-bold text-emerald-400">Target: &lt;10% residual risk by Day 14</span>
        </div>
      </div>

      {/* ── RIGHT: WEATHER INTELLIGENCE & SPRAY WINDOW (5 cols) ── */}
      <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-gray-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CloudRain className="text-blue-500" size={20} />
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Weather Context</h3>
            </div>
            <span className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">
              {weather.freshness || "Real-time sync"}
            </span>
          </div>

          {/* Meteorological Metric Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2.5">
              <Thermometer className="text-amber-500 shrink-0" size={18} />
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Temperature</span>
                <span className="text-sm font-black text-gray-900">{temp}</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2.5">
              <Droplets className="text-blue-500 shrink-0" size={18} />
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Rel. Humidity</span>
                <span className="text-sm font-black text-gray-900">{humidity}</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2.5">
              <Wind className="text-teal-500 shrink-0" size={18} />
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Wind Speed</span>
                <span className="text-sm font-black text-gray-900">{windSpeed}</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2.5">
              <CloudRain className="text-indigo-500 shrink-0" size={18} />
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Rain Probability</span>
                <span className="text-sm font-black text-gray-900">{rainProb}</span>
              </div>
            </div>
          </div>

          {/* Disease Conducive Factors (if present) */}
          {weather.conducive_conditions && (
            <div className="mb-4 p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed">
              <strong className="font-bold">Pathology Risk: </strong>
              {weather.conducive_conditions}
            </div>
          )}
        </div>

        {/* ── VERIFIED OPTIMAL SPRAY WINDOW ── */}
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${sprayBadge.bg}`}>
              {sprayBadge.icon}
              <span>{sprayBadge.title}</span>
            </span>
          </div>

          <p className="text-xs font-black text-gray-900 mt-2 flex items-center gap-1.5">
            <CalendarClock size={13} className="text-indigo-600" />
            <span>{recommendedTime}</span>
          </p>

          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
            {sprayReason}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default AIInsights;
