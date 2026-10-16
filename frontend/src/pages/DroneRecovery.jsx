import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import { Camera, UploadCloud, TrendingUp, AlertTriangle, Play, Pause, Activity, Plane, CheckCircle, Server, Terminal, X, Wifi } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DroneRecovery = () => {
  const { t } = useTranslation();
  

  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState('');
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeScanIndex, setActiveScanIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Drone Deployment Simulation State
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState([]);

  useEffect(() => {
    fetchFarms();
  }, []);

  useEffect(() => {
    if (selectedFarm) {
      fetchTimeline(selectedFarm);
    } else {
      setScans([]);
    }
  }, [selectedFarm]);

  useEffect(() => {
    let interval;
    if (isPlaying && scans.length > 0) {
      interval = setInterval(() => {
        setActiveScanIndex((prev) => (prev + 1) % scans.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, scans.length]);

  const fetchFarms = async () => {
    

    try {
      const res = await api.get('/farms');
      setFarms(res.data);
      if (res.data.length > 0) {
        setSelectedFarm(res.data[0].id);
      }
    } catch {
      toast.error('Failed to load farms');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async (farmId) => {
    

    try {
      const res = await api.get(`/drones/timeline/${farmId}`);
      setScans(res.data);
      if (res.data.length > 0) {
        setActiveScanIndex(res.data.length - 1); // Start at latest
      }
    } catch {
      toast.error('Failed to load recovery timeline');
    }
  };

  const handleUploadAndDeploy = async (e) => {
    

    const file = e.target.files[0];
    if (!file) return;
    if (!selectedFarm) {
      toast.error('Please select a farm to deploy the drone.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('farm_id', selectedFarm);

    setShowDeployModal(true);
    setDeployStep(0);
    setTerminalLogs(["> Connecting to Drone Telemetry Socket..."]);

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultWsHost = window.location.hostname === 'localhost' ? 'localhost:8000' : 'dr-agri-ai.onrender.com';
    const wsHost = import.meta.env.VITE_WS_HOST || defaultWsHost;
    const wsUrl = `${wsProtocol}//${wsHost}/api/v1/drones/stream/${selectedFarm}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.step !== undefined) {
        setDeployStep(data.step);
      }
      if (data.logs) {
        setTerminalLogs(prev => [...prev, ...data.logs]);
      }
      
      // When backend says it reached processing step, we upload the actual image
      if (data.step === 4) {
        try {
          await api.post('/drones/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          setDeployStep(5);
          setTerminalLogs(prev => [...prev, "> Drone returning to base.", "> Payload successfully processed!"]);
          toast.success('Drone mission completed successfully!');
          fetchTimeline(selectedFarm);
        } catch (err) {
          toast.error('Drone connection lost during payload processing.');
          setTerminalLogs(prev => [...prev, "> ERROR: Telemetry sync failed!"]);
        } finally {
          ws.send("close");
          setTimeout(() => setShowDeployModal(false), 2500);
        }
      }
    };

    ws.onerror = () => {
      toast.error('Failed to establish telemetry connection.');
      setTerminalLogs(prev => [...prev, "> ERROR: Socket connection failed."]);
      setTimeout(() => setShowDeployModal(false), 2000);
    };

    // Reset file input
    e.target.value = null;
  };

  const activeScan = scans[activeScanIndex];

  // Helper to color code the NDVI score
  const getHealthColor = (score) => {
    

    if (score >= 80) return '#22c55e'; // Green
    if (score >= 50) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const chartData = scans.map((s, idx) => ({
    name: `Scan ${idx + 1}`,
    score: s.health_score,
    date: new Date(s.created_at).toLocaleDateString()
  }));

  if (loading) {
    return <div className="flex justify-center items-center h-[70vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div></div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-3 sm:px-6 w-full min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2 sm:gap-3">
            <Camera className="w-7 h-7 sm:w-8 h-8 text-teal-600 shrink-0" />
            <span className="truncate">{t("drone_recovery_monit")}</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">{t("track_field_health_a")}</p>
        </div>
        
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <select 
            value={selectedFarm} 
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 bg-white font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-teal-500 outline-none text-sm"
          >
            <option value="">{t("select_farm___")}</option>
            {farms.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          
          <label className="bg-teal-600 text-white px-5 sm:px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-teal-700 transition shadow-lg shadow-teal-200 cursor-pointer text-sm">
            <Plane size={18} />{t("deploy_drone")}<input type="file" className="hidden" accept="image/*" onChange={handleUploadAndDeploy} />
          </label>
        </div>
      </div>

      {!selectedFarm ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-600 mb-2">{t("no_farm_selected")}</h3>
          <p className="text-gray-400">{t("please_select_a_farm")}</p>
        </div>
      ) : scans.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-600 mb-2">{t("no_scans_found")}</h3>
          <p className="text-gray-400 mb-6">{t("upload_your_first_dr")}</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Visualizer */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">{t("ndvi_heatmap_viewer")}</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm font-bold shadow-sm hover:bg-gray-50 transition"
                >
                  {isPlaying ? <><Pause size={16}/>{t("pause")}</> : <><Play size={16}/>{t("play_time_lapse")}</>}
                </button>
              </div>
            </div>
            
            <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
              {activeScan && (
                <motion.div
                  key={activeScan.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="relative w-full h-full"
                >
                  <img 
                    src={activeScan.image_url.startsWith('http') || activeScan.image_url.startsWith('data:') ? activeScan.image_url : `${import.meta.env.VITE_BACKEND_URL || ''}${activeScan.image_url}`} 
                    alt="Farm Scan" 
                    className="w-full h-full object-cover"
                  />
                  {/* Simulate NDVI Overlay using CSS mixing/filters based on health score */}
                  <div 
                    className="absolute inset-0 mix-blend-overlay opacity-60"
                    style={{
                      background: `linear-gradient(to bottom right, ${getHealthColor(activeScan.health_score)}, transparent)`
                    }}
                  />
                  
                  {/* Info Badge overlay */}
                  <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white px-5 py-3 rounded-2xl border border-white/10 shadow-xl">
                    <div className="text-xs text-gray-300 font-bold uppercase tracking-wider mb-2">
                      {new Date(activeScan.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 font-black text-2xl mb-1">
                      <Activity size={24} style={{ color: getHealthColor(activeScan.health_score) }} />{t("ndvi_")}{activeScan.health_score.toFixed(1)}
                    </div>
                    {activeScan.detected_disease && (
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <div className="text-xs text-gray-400 font-bold uppercase">{t("ai_analysis")}</div>
                        <div className="text-sm font-semibold text-white mt-1">
                          {activeScan.detected_disease.replace(/___/g, ' - ').replace(/_/g, ' ')}
                        </div>
                        {activeScan.severity && activeScan.severity !== 'unknown' && (
                          <div className={`text-xs font-bold mt-1 uppercase ${
                            activeScan.severity === 'high' ? 'text-red-400' :
                            activeScan.severity === 'medium' ? 'text-yellow-400' : 'text-green-400'
                          }`}>{t("severity_")}{activeScan.severity}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* Scrubber */}
            <div className="p-6 bg-gray-50">
              <input 
                type="range" 
                min="0" 
                max={scans.length - 1} 
                value={activeScanIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  setActiveScanIndex(parseInt(e.target.value));
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between mt-2 text-xs font-bold text-gray-400">
                <span>{t("first_scan")}</span>
                <span>{t("latest_scan")}</span>
              </div>
            </div>
          </div>

          {/* Stats & Chart */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="text-teal-500" />{t("recovery_trajectory")}</h2>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-500 mb-1">{t("current_health_score")}</p>
                <div className="flex items-end gap-3">
                  <h3 className="text-4xl font-black text-gray-900">
                    {scans[scans.length - 1]?.health_score.toFixed(1)}
                  </h3>
                  {scans.length > 1 && (
                    <span className="bg-green-100 text-green-700 text-sm font-bold px-2 py-1 rounded-lg mb-1">
                      +{(scans[scans.length - 1].health_score - scans[scans.length - 2].health_score).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#0d9488" 
                      strokeWidth={4} 
                      dot={{ fill: '#0d9488', strokeWidth: 2, r: 6 }} 
                      activeDot={{ r: 8, fill: '#14b8a6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 bg-teal-50 border border-teal-100 rounded-xl p-4 text-sm text-teal-800 font-medium">{t("the_ndvi_health_inde")}</div>
            </div>
          </div>
        </div>
      )}

      {/* --- Drone Deployment Modal --- */}
      <AnimatePresence>
        {showDeployModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="absolute inset-0" onClick={() => deployStep === 5 && setShowDeployModal(false)} />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                <div className="flex items-center gap-3">
                  <div className="bg-teal-500/20 p-2 rounded-lg">
                    <Plane className="text-teal-400 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold tracking-wide">{t("uav_flight_command")}</h3>
                    <p className="text-gray-500 text-xs font-mono uppercase">{t("target__farm_id")}{selectedFarm}</p>
                  </div>
                </div>
                {deployStep === 5 && (
                  <button onClick={() => setShowDeployModal(false)} className="text-gray-400 hover:text-white transition">
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Progress Visualizer */}
              <div className="p-4 sm:p-8 border-b border-gray-800 bg-black flex justify-between relative overflow-x-auto scrollbar-none">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-8 sm:left-10 right-8 sm:right-10 h-0.5 bg-gray-800 -translate-y-1/2 z-0" />
                <div 
                  className="absolute top-1/2 left-8 sm:left-10 h-0.5 bg-teal-500 -translate-y-1/2 z-0 transition-all duration-700" 
                  style={{ width: `${(deployStep / 5) * 100}%`, maxWidth: 'calc(100% - 60px)' }}
                />

                {/* Nodes */}
                {[
                  { id: 0, label: "Uplink", icon: <Wifi className="w-4 h-4 sm:w-5 sm:h-5" /> },
                  { id: 1, label: "Takeoff", icon: <Plane className="w-4 h-4 sm:w-5 sm:h-5" /> },
                  { id: 3, label: "Scanning", icon: <Camera className="w-4 h-4 sm:w-5 sm:h-5" /> },
                  { id: 4, label: "Telemetry", icon: <Server className="w-4 h-4 sm:w-5 sm:h-5" /> },
                  { id: 5, label: "Complete", icon: <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> },
                ].map((node, i) => {
                  const isActive = deployStep >= node.id;
                  const isCurrent = deployStep === node.id || (deployStep === 2 && node.id === 1);
                  return (
                    <div key={i} className="relative z-10 flex flex-col items-center gap-1.5 sm:gap-3">
                      <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                        isActive ? 'bg-teal-900/50 border-teal-500 text-teal-400' : 'bg-gray-900 border-gray-700 text-gray-600'
                      } ${isCurrent ? 'shadow-[0_0_15px_rgba(20,184,166,0.5)]' : ''}`}>
                        {isCurrent && <div className="absolute inset-0 rounded-full border border-teal-400 animate-ping opacity-20" />}
                        {node.icon}
                      </div>
                      <span className={`text-[10px] sm:text-xs font-mono uppercase font-bold ${isActive ? 'text-teal-400' : 'text-gray-600'}`}>
                        {node.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Terminal View */}
              <div className="p-6 bg-gray-900 font-mono text-sm h-64 overflow-y-auto">
                <div className="flex items-center gap-2 text-teal-500 mb-4 font-bold text-xs">
                  <Terminal size={14} />{t("live_terminal_output")}</div>
                <div className="space-y-2">
                  {terminalLogs.map((log, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`${log.includes("complete") || log.includes("GRANTED") ? 'text-teal-400 font-bold' : 'text-gray-400'}`}
                    >
                      {log}
                    </motion.div>
                  ))}
                  {deployStep < 5 && (
                    <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-teal-500 inline-block w-2 h-4 bg-teal-500 ml-1" />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DroneRecovery;
