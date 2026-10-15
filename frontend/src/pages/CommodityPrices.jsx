import { catalog } from "./CommodityPrices.catalog.js";
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Brain,
  AlertCircle,
  DollarSign,
  MapPin,
  Calendar,
  Database
} from 'lucide-react';
import { 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import api from '../services/api';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const historical = payload.find(p => p.dataKey === 'actual_price');
    const predicted = payload.find(p => p.dataKey === 'predicted_price');
    const upper = payload.find(p => p.dataKey === 'upper_bound');
    const lower = payload.find(p => p.dataKey === 'lower_bound');

    return (
      <div className="bg-gray-900 text-white p-4 rounded-xl shadow-xl border border-gray-700 min-w-[200px]">
        <p className="text-gray-400 font-bold mb-3">{label}</p>
        
        {historical && (
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-300">Actual:</span>
            <span className="font-black text-lg">₹{historical.value}</span>
          </div>
        )}
        
        {predicted && (
          <>
            <div className="flex justify-between items-center mb-1">
              <span className="text-indigo-300">Predicted:</span>
              <span className="font-black text-indigo-400 text-lg">₹{predicted.value}</span>
            </div>
            {upper && lower && (
              <div className="flex justify-between items-center text-sm text-gray-500 mt-2 pt-2 border-t border-gray-700">
                <span>Range:</span>
                <span>₹{lower.value} - ₹{upper.value}</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
  return null;
};

const CommodityPrices = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  
  // New Cascading Dropdown State
  const [state, setState] = useState("Karnataka");
  const [district, setDistrict] = useState("Bengaluru");
  const [market, setMarket] = useState("K.R. Market");
  const [crop, setCrop] = useState("Tomato");
  const [horizon, setHorizon] = useState(7);

  // Hardcoded for demo - in reality this would be fetched from backend catalog
  

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setForecast(null); // Clear previous
    
    try {
      const res = await api.post(`/commodity/predict`, {
        crop: crop,
        state: state,
        district: district,
        market: market,
        horizonDays: parseInt(horizon)
      });
      
      if (res.data.predictionAvailable) {
        setForecast(res.data);
      } else {
        toast.error(res.data.message || t('failed_to_load_commodity_f'));
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error(t('failed_to_load_commodity_f') || 'Failed to load forecast');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
            Real-Time Market Predictor
          </h1>
          <p className="text-gray-500 font-medium text-lg">
            ML Forecasting powered by official agricultural data.
          </p>
        </div>
      </div>

      <form onSubmit={handlePredict} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">State</label>
          <select 
            className="w-full border-gray-300 rounded-xl px-4 py-3 bg-gray-50 font-medium focus:ring-indigo-500"
            value={state} onChange={(e) => setState(e.target.value)}
          >
            {Object.keys(catalog).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">District</label>
          <select 
            className="w-full border-gray-300 rounded-xl px-4 py-3 bg-gray-50 font-medium focus:ring-indigo-500"
            value={district} onChange={(e) => setDistrict(e.target.value)}
          >
            {catalog[state] && Object.keys(catalog[state]).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Market (Mandi)</label>
          <select 
            className="w-full border-gray-300 rounded-xl px-4 py-3 bg-gray-50 font-medium focus:ring-indigo-500"
            value={market} onChange={(e) => setMarket(e.target.value)}
          >
            {catalog[state] && catalog[state][district] && Object.keys(catalog[state][district]).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Crop</label>
          <select 
            className="w-full border-gray-300 rounded-xl px-4 py-3 bg-gray-50 font-medium focus:ring-indigo-500"
            value={crop} onChange={(e) => setCrop(e.target.value)}
          >
            {catalog[state] && catalog[state][district] && catalog[state][district][market] && catalog[state][district][market].map(c => <option key={c} value={c}>{c}</option>)}
            <option value="ABC">Test Fake Crop (ABC)</option>
          </select>
        </div>
        <div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Brain size={18} />
            {loading ? "Forecasting..." : "Predict"}
          </button>
        </div>
      </form>

      {forecast && (
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Metadata Card */}
          <div className="col-span-1 flex flex-col gap-6">
            <div className={`rounded-3xl p-6 text-white relative overflow-hidden shadow-xl
              ${forecast.action_color === 'red' ? 'bg-gradient-to-br from-red-500 to-red-700' : 
                forecast.action_color === 'green' ? 'bg-gradient-to-br from-green-500 to-green-700' : 
                forecast.action_color === 'orange' ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 
                'bg-gradient-to-br from-blue-500 to-blue-700'}`}
            >
              <h2 className="text-3xl font-black mb-2">{forecast.recommendation}</h2>
              <p className="text-white/90 text-md leading-relaxed font-medium mb-6">
                {forecast.message}
              </p>
              
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-2 border border-white/20">
                <div className="flex justify-between items-center">
                  <p className="text-white/80 text-sm font-bold uppercase">Latest Price</p>
                  <p className="text-xl font-black">₹{forecast.latestMarketPrice}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-white/80 text-sm font-bold uppercase">{forecast.horizonDays}-Day Forecast</p>
                  <p className="text-xl font-black flex items-center gap-1">
                    ₹{forecast.predictedPrice}
                    {forecast.predictedPrice > forecast.latestMarketPrice ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                  </p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/20">
                  <p className="text-white/80 text-xs font-bold uppercase">Confidence Range</p>
                  <p className="text-sm font-bold text-white/90">₹{forecast.predictionRange.low} - ₹{forecast.predictionRange.high}</p>
                </div>
              </div>
            </div>

            {/* Source Information */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
               <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 border-b pb-3"><Database size={18} className="text-indigo-500"/> Data Source Transparency</h3>
               <div className="text-sm font-medium text-gray-600 flex flex-col gap-2">
                 <div className="flex justify-between"><span className="text-gray-400">Source:</span> <span>{forecast.dataSource}</span></div>
                 <div className="flex justify-between"><span className="text-gray-400">Market:</span> <span>{forecast.market}</span></div>
                 <div className="flex justify-between"><span className="text-gray-400">Last Updated:</span> <span>{forecast.latestMarketPriceDate}</span></div>
                 <div className="flex justify-between"><span className="text-gray-400">History:</span> <span>{forecast.historicalObservations} days</span></div>
                 <div className="flex justify-between"><span className="text-gray-400">ML Model:</span> <span>{forecast.model} v{forecast.modelVersion}</span></div>
               </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="col-span-2 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                <DollarSign className="text-indigo-500" />Price Trajectory: {forecast.crop} ({forecast.unit})
              </h2>
              <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-800"></span>Historical</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-500"></span>Predicted</span>
              </div>
            </div>
            
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecast.chart_data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 'bold' }} 
                    axisLine={false} 
                    tickLine={false}
                    minTickGap={30}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 'bold' }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Confidence Interval Area */}
                  <Area 
                    type="monotone" 
                    dataKey="upper_bound" 
                    stroke="none" 
                    fill="#e0e7ff" 
                    activeDot={false}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="lower_bound" 
                    stroke="none" 
                    fill="#ffffff" 
                    activeDot={false}
                  />

                  {/* Historical Line */}
                  <Line 
                    type="monotone" 
                    dataKey="actual_price" 
                    name="Historical Price"
                    stroke="#1f2937" 
                    strokeWidth={3} 
                    dot={false}
                    activeDot={{ r: 6, fill: '#1f2937' }}
                  />

                  {/* Predicted Line */}
                  <Line 
                    type="monotone" 
                    dataKey="predicted_price" 
                    name="AI Prediction"
                    stroke="#6366f1" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 6, fill: '#6366f1' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-4">
        <AlertCircle className="text-indigo-500 w-6 h-6 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-900 font-medium leading-relaxed">
          <strong>Disclaimer:</strong> {t("ai_predictions_are_g")}
        </p>
      </div>
    </div>
  );
};

export default CommodityPrices;
