import { motion } from 'framer-motion';
import { Sparkles, Thermometer, CloudRain, Droplets, CalendarClock, BrainCircuit, ScanLine, Activity, CloudLightning, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AIInsights = ({ result, ui }) => {
  if (!result) return null;

  // Dynamic chart data from backend or fallback to generic
  const chartData = result.chart_data || [
    { day: 'Day 1', risk: 85 },
    { day: 'Day 3', risk: 70 },
    { day: 'Day 7', risk: 40 },
    { day: 'Day 14', risk: 10 }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6"
    >
      <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-3xl p-6 shadow-sm border border-indigo-800 text-white relative overflow-hidden">
        <Sparkles className="absolute top-4 right-4 text-indigo-400 opacity-20 w-32 h-32" />
        <h3 className="text-xl font-black tracking-tight flex items-center gap-2 mb-6 relative z-10">
          <BrainCircuit className="text-indigo-400" size={24} />
          {ui.aiInsightsTitle}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-10">
          <div className="bg-white/10 rounded-2xl p-4 border border-white/10 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <ScanLine size={16} className="text-indigo-300 shrink-0"/>
              <span className="text-xs font-bold text-indigo-100 uppercase tracking-wider truncate">{ui.infectionArea}</span>
            </div>
            <span className="text-2xl font-black text-white">24<span className="text-sm ml-1">%</span></span>
          </div>

          <div className="bg-white/10 rounded-2xl p-4 border border-white/10 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-rose-300 shrink-0"/>
              <span className="text-xs font-bold text-indigo-100 uppercase tracking-wider truncate">{ui.yieldImpact}</span>
            </div>
            <span className="text-2xl font-black text-rose-300">-12<span className="text-sm ml-1">%</span></span>
          </div>

          <div className="bg-white/10 rounded-2xl p-4 border border-white/10 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit size={16} className="text-emerald-300 shrink-0"/>
              <span className="text-xs font-bold text-indigo-100 uppercase tracking-wider truncate">{ui.topAltPrediction}</span>
            </div>
            <span className="text-sm font-black text-emerald-300 leading-tight">{ui.healthyConfidence}</span>
          </div>
        </div>

        <div className="h-32 w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#818CF8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1E1B4B', border: 'none', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#818CF8' }}
              />
              <Area type="monotone" dataKey="risk" stroke="#818CF8" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest text-center mt-2 relative z-10">Projected Risk Reduction with Treatment</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
        <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 mb-4">
          <CloudRain className="text-blue-500" size={24} />
          {ui.weatherSync}
        </h3>
        
        <div className="space-y-4 flex-grow">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <Thermometer className="text-amber-500" size={20} />
              <span className="text-sm font-bold text-gray-700">{ui.temp}</span>
            </div>
            <span className="font-black text-gray-900">{result.weather_snapshot?.temperature || "N/A"}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-3">
              <Droplets className="text-blue-500" size={20} />
              <span className="text-sm font-bold text-gray-700">{ui.humidity}</span>
            </div>
            <span className="font-black text-gray-900">{result.weather_snapshot?.humidity || "N/A"}</span>
          </div>
        </div>

        <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center gap-1">
            <CalendarClock size={12} /> {ui.sprayTimeTitle}
          </p>
          <p className="text-sm font-bold text-emerald-900 mt-1">{result.spray_time || "Tomorrow, 6:00 AM - 8:30 AM"}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default AIInsights;
