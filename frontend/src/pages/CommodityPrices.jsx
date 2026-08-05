import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Brain, AlertCircle, BarChart3 } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CROPS = ["Tomato", "Rice", "Wheat", "Cotton", "Onion"];

const CommodityPrices = () => {
  const [selectedCrop, setSelectedCrop] = useState("Tomato");
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecast(selectedCrop);
  }, [selectedCrop]);

  const fetchForecast = async (crop) => {
    setLoading(true);
    try {
      const res = await api.get(`/commodity/predict/${crop}`);
      setForecast(res.data);
    } catch {
      toast.error('Failed to load commodity forecast');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !forecast) {
    return <div className="flex justify-center items-center h-[70vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;
  }

  // Custom Tooltip for the chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => {
            if (entry.dataKey === 'lower_bound') return null; // Hide lower bound from tooltip
            if (entry.dataKey === 'upper_bound' && entry.value) {
              return (
                <p key={index} className="text-sm text-gray-500">
                  Confidence Range: <span className="font-bold">₹{payload.find(p => p.dataKey === 'lower_bound')?.value} - ₹{entry.value}</span>
                </p>
              );
            }
            if (entry.value) {
              return (
                <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
                  {entry.name}: ₹{entry.value}
                </p>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-600" />
            AI Price Predictor
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Predict commodity prices 30 days into the future to maximize your profit.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Select Crop:</label>
          <div className="relative flex items-center">
            <input 
              type="text"
              list="crop-list"
              value={selectedCrop} 
              onChange={(e) => setSelectedCrop(e.target.value)}
              placeholder="Type or select..."
              className="border border-gray-200 rounded-xl px-6 py-3 bg-white font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-lg w-[200px]"
            />
            <datalist id="crop-list">
              {CROPS.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {forecast && (
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* AI Recommendation Card */}
          <div className={`col-span-1 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl
            ${forecast.action_color === 'red' ? 'bg-gradient-to-br from-red-500 to-red-700' : 
              forecast.action_color === 'green' ? 'bg-gradient-to-br from-green-500 to-green-700' : 
              forecast.action_color === 'orange' ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 
              'bg-gradient-to-br from-blue-500 to-blue-700'}`}
          >
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Brain size={120} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-white/80 font-bold uppercase tracking-widest text-sm mb-6">
                <Brain size={16} /> AI Financial Analyst
              </div>
              
              <h2 className="text-4xl font-black mb-4">{forecast.recommendation}</h2>
              <p className="text-white/90 text-lg leading-relaxed font-medium mb-8">
                {forecast.message}
              </p>
              
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex justify-between items-center border border-white/20">
                <div>
                  <p className="text-white/70 text-sm font-bold uppercase">Current Price</p>
                  <p className="text-2xl font-black">₹{forecast.current_price} <span className="text-sm font-normal">/ quintal</span></p>
                </div>
                <div>
                  <p className="text-white/70 text-sm font-bold uppercase">30-Day Forecast</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-black">₹{forecast.forecast_30d}</p>
                    {forecast.forecast_30d > forecast.current_price ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="col-span-2 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                <DollarSign className="text-indigo-500" /> Price Trajectory: {forecast.crop}
              </h2>
              <div className="flex items-center gap-4 text-sm font-bold text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-800"></span> Historical</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> Predicted</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-200"></span> Confidence Range</span>
              </div>
            </div>
            
            <div className="h-[400px]">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center opacity-50">Loading new forecast...</div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-4">
        <AlertCircle className="text-indigo-500 w-6 h-6 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-900 font-medium leading-relaxed">
          <strong>Disclaimer:</strong> AI predictions are generated using time-series forecasting models (ARIMA/Prophet) based on historical market data and seasonal trends. While highly accurate, global macroeconomic events can cause unpredictable volatility. Use these recommendations as a guide, not absolute financial advice.
        </p>
      </div>
    </div>
  );
};

export default CommodityPrices;
