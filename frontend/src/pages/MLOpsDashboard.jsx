import { useState, useEffect } from 'react';
import { Activity, AlertOctagon, TrendingDown, RefreshCw, Cpu, Database, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MLOpsDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/mlops/drift-metrics');
      setMetrics(res.data);
    } catch {
      toast.error('Failed to load MLOps metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    if (!window.confirm("WARNING: Initiating model retraining will provision GPU instances and cost approximately $450 in AWS credits. Proceed?")) return;
    
    setRetraining(true);
    setProgress(0);
    
    // Simulate a progress bar
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 95) {
          clearInterval(interval);
          return 95;
        }
        return p + 5;
      });
    }, 500);

    try {
      const res = await api.post('/mlops/retrain');
      clearInterval(interval);
      setProgress(100);
      toast.success(res.data.message);
      
      setTimeout(() => {
        setRetraining(false);
        setProgress(0);
      }, 3000);
    } catch {
      clearInterval(interval);
      setRetraining(false);
      setProgress(0);
      toast.error('Retraining Pipeline Failed');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[70vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
            <Cpu className="w-8 h-8 text-red-600" />
            Enterprise MLOps & Model Drift
          </h1>
          <p className="text-gray-500 mt-1 font-medium">Monitor AI inference accuracy and concept drift in production.</p>
        </div>
        
        <button 
          onClick={handleRetrain}
          disabled={retraining}
          className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition shadow-lg shadow-red-200 disabled:opacity-70 relative overflow-hidden"
        >
          {retraining && (
            <div 
              className="absolute left-0 top-0 bottom-0 bg-red-800 transition-all duration-300" 
              style={{ width: `${progress}%` }} 
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <RefreshCw size={20} className={retraining ? "animate-spin" : ""} />
            {retraining ? `Provisioning GPU... ${progress}%` : "Initiate Model Retraining"}
          </span>
        </button>
      </div>

      {metrics?.status === 'alert' && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl mb-8 flex items-start gap-4">
          <AlertOctagon className="text-red-500 w-6 h-6 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-red-800 font-bold">Critical Concept Drift Detected</h3>
            <p className="text-red-600 text-sm mt-1">
              Global inference accuracy has dropped to <strong>{metrics.current_accuracy}%</strong> over the last 30 days. 
              The threshold is 90.0%. Retraining is highly recommended.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Accuracy Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="text-blue-500" /> Model Accuracy (6 Months)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.accuracy_history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis domain={[85, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }} 
                  activeDot={{ r: 6, fill: '#b91c1c' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Regional Drift Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Database className="text-purple-500" /> Data Drift by Region
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.regional_drift} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" hide />
                <YAxis dataKey="region" type="category" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="drift_score" radius={[0, 4, 4, 0]}>
                  {metrics.regional_drift.map((entry, index) => (
                    <cell key={`cell-${index}`} fill={entry.drift_score > 20 ? '#ef4444' : '#8b5cf6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" /> Specific Class Failures (Concept Drift)
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {metrics.class_failures.map((failure, idx) => (
            <div key={idx} className="p-6 flex items-center justify-between hover:bg-gray-50 transition">
              <div>
                <h3 className="font-bold text-gray-900">{failure.disease}</h3>
                <p className="text-sm text-gray-500">Confidence score moving average has dropped significantly.</p>
              </div>
              <div className="bg-red-100 text-red-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
                <TrendingDown size={18} />
                - {failure.confidence_drop} Accuracy
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MLOpsDashboard;
