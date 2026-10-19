import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Truck, WifiOff, Wifi, CheckCircle, Package, Camera, MapPin, Navigation, Map, X, PenTool, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';

// Professional Custom Markers
const createCustomIcon = (color) => {
  
  

  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);"></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const activeIcon = createCustomIcon('#3B82F6'); // Blue
const deliveredIcon = createCustomIcon('#10B981'); // Green
const driverIcon = L.divIcon({
  className: 'driver-icon',
  html: `<div style="background-color: #F59E0B; width: 28px; height: 28px; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const MapUpdater = ({ points }) => {
  const { t } = useTranslation();
  

  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [points, map]);
  return null;
};

const Deliveries = () => {
  const { t } = useTranslation();
  

  const [routePoints, setRoutePoints] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [syncQueue, setSyncQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  // POD (Proof of Delivery) Modal State
  const [podModal, setPodModal] = useState({ isOpen: false, order: null });
  const [signatureMode, setSignatureMode] = useState(true);
  const [podImage, setPodImage] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sigCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const [driverLocation, setDriverLocation] = useState(null);

  // Nashik coordinates roughly
  const defaultCenter = [19.9975, 73.7898];

  useEffect(() => {
    fetchRoutes();
    const savedQueue = localStorage.getItem('agri_delivery_sync_queue');
    if (savedQueue) setSyncQueue(JSON.parse(savedQueue));
    
    // Live Driver Location Tracking
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setDriverLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.log("Driver location tracking denied", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const fetchRoutes = async () => {
    

    setLoading(true);
    try {
      const res = await api.get('/delivery/routes/optimized');
      setRoutePoints(res.data);
    } catch (err) {
      toast.error("Failed to fetch optimized routes");
      setRoutePoints([
        { order_id: '1', order_ref: 'ORD-A1', farmer_name: 'Farmer John', address: 'Plot 4, North Block', lat: 19.9975, lng: 73.7898, status: 'Pending' },
        { order_id: '2', order_ref: 'ORD-A2', farmer_name: 'Farmer Smith', address: 'Plot 12, East Block', lat: 20.0050, lng: 73.7950, status: 'Pending' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleOfflineMode = () => {
    

    if (isOffline) syncOfflineData();
    else toast.info("Switched to Offline Mode. Routes cached locally.");
    setIsOffline(!isOffline);
  };

  const syncOfflineData = async () => {
    

    if (syncQueue.length === 0) {
      setIsOffline(false);
      toast.success("Online. Everything is up to date.");
      return;
    }
    try {
      toast.info(`Syncing ${syncQueue.length} deliveries...`);
      await api.post('/delivery/sync-offline', syncQueue);
      toast.success("Successfully Synced to Cloud!");
      setSyncQueue([]);
      localStorage.removeItem('agri_delivery_sync_queue');
      fetchRoutes(); 
    } catch (err) {
      toast.error("Failed to sync. Server might be unreachable.");
      return;
    }
    setIsOffline(false);
  };

  const openPODModal = (order) => {
    

    setPodModal({ isOpen: true, order });
    setSignatureMode(true);
    setPodImage(null);
    setHasSignature(false);
  };

  const closePODModal = () => {
    

    setPodModal({ isOpen: false, order: null });
    stopCamera();
  };

  // ─── Camera Logic ───
  const startCamera = async () => {
    

    setSignatureMode(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      toast.error("Camera access denied or unavailable");
    }
  };

  const stopCamera = () => {
    

    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  };

  const capturePhoto = () => {
    

    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    setPodImage(canvasRef.current.toDataURL('image/jpeg'));
    stopCamera();
  };

  // ─── Signature Logic ───
  const startDrawing = ({ nativeEvent }) => {
    

    const { offsetX, offsetY } = nativeEvent;
    const ctx = sigCanvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    

    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = sigCanvasRef.current.getContext('2d');
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    

    const ctx = sigCanvasRef.current.getContext('2d');
    ctx.closePath();
    setIsDrawing(false);
  };

  const clearSignature = () => {
    

    const ctx = sigCanvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, sigCanvasRef.current.width, sigCanvasRef.current.height);
    setHasSignature(false);
  };

  // ─── Submit POD ───
  const submitPOD = () => {
    

    const order = podModal.order;
    setRoutePoints(prev => prev.map(p => p.order_id === order.order_id ? { ...p, status: 'Delivered' } : p));

    // Use canvas signature or captured photo
    const sigData = hasSignature ? sigCanvasRef.current.toDataURL('image/jpeg') : podImage;

    const updatePayload = {
      order_id: order.order_id,
      status: "Delivered",
      timestamp: new Date().toISOString(),
      signature_hash: sigData || null
    };

    if (isOffline) {
      const newQueue = [...syncQueue, updatePayload];
      setSyncQueue(newQueue);
      localStorage.setItem('agri_delivery_sync_queue', JSON.stringify(newQueue));
      toast.success("POD Captured. Saved locally (Offline).");
    } else {
      api.post('/delivery/sync-offline', [updatePayload])
        .then(() => toast.success("POD Captured & Synced!"))
        .catch(() => {
           toast.error("Network error. Saving POD to local queue.");
           const newQueue = [...syncQueue, updatePayload];
           setSyncQueue(newQueue);
           localStorage.setItem('agri_delivery_sync_queue', JSON.stringify(newQueue));
        });
    }
    closePODModal();
  };

  const activePoints = routePoints.filter(p => p.status === 'Pending');
  const pathCoordinates = activePoints.map(p => [p.lat, p.lng]);

  return (
    <div className="max-w-[1600px] mx-auto py-4 sm:py-8 px-2 sm:px-4 min-h-[calc(100vh-5rem)] flex flex-col min-w-0">

      {/* ─── Premium Header ─── */}
      <div className="bg-gray-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-4 sm:mb-6 shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center text-white relative overflow-hidden gap-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform translate-x-1/3 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3 tracking-tight">
            <Truck className="w-7 h-7 sm:w-8 h-8 text-blue-400 shrink-0" />
            <span>{t("logistics_command_ce")}</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1 font-medium">{t("ai_optimized_farm_ga")}</p>
        </div>
        
        <div className="relative z-10 w-full lg:w-auto flex flex-col sm:flex-row gap-3">
          <div className="bg-gray-800/50 backdrop-blur border border-gray-700 px-4 py-2 rounded-xl flex items-center justify-around sm:justify-start gap-4">
            <div className="text-center sm:text-right">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t("pending")}</p>
              <p className="text-xl font-black text-white">{activePoints.length}</p>
            </div>
            <div className="w-px h-8 bg-gray-700"></div>
            <div className="text-center sm:text-left">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t("delivered")}</p>
              <p className="text-xl font-black text-emerald-400">{routePoints.length - activePoints.length}</p>
            </div>
          </div>

          <button 
            onClick={toggleOfflineMode}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg text-sm sm:text-base ${
              isOffline 
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-500/20 hover:shadow-orange-500/40' 
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40'
            }`}
          >
            {isOffline ? <WifiOff size={18} /> : <Wifi size={18} />}
            {isOffline ? 'Offline Mode Active' : 'Live Syncing'}
          </button>
        </div>
      </div>

      {syncQueue.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} 
          className="mb-4 sm:mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 font-bold text-orange-600">
            <AlertCircle size={20} />
            {syncQueue.length}{t("offline_deliveries_p")}</div>
          {!isOffline && (
            <button onClick={syncOfflineData} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-xl font-bold transition shadow-md shadow-orange-600/20">{t("sync_to_cloud_now")}</button>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 flex-1 min-h-0">
        
        {/* ─── Route Sequence List ─── */}
        <div className="lg:col-span-4 flex flex-col h-[380px] sm:h-[450px] lg:h-auto bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-extrabold text-gray-900 flex items-center gap-2">
              <Navigation size={20} className="text-blue-600" />{t("optimal_sequence")}</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">{t("ai_sorted")}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
            {loading ? (
               <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
            ) : routePoints.length === 0 ? (
               <div className="text-center text-gray-400 py-10 font-medium">{t("no_pending_deliverie")}</div>
            ) : (
              routePoints.map((point, index) => (
                <motion.div 
                  key={point.order_id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative border-2 rounded-2xl p-5 transition-all ${point.status === 'Delivered' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-blue-100 hover:border-blue-300 shadow-sm'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${point.status === 'Delivered' ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white shadow-md'}`}>
                        {index + 1}
                      </span>
                      {point.status === 'Delivered' ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-sm"><CheckCircle size={16}/>{t("delivered")}</span>
                      ) : (
                        <span className="text-blue-600 font-bold text-sm tracking-wide">{point.order_ref}</span>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-extrabold text-lg text-gray-900 mb-1">{point.farmer_name}</h3>
                  <p className="text-sm text-gray-500 font-medium flex items-start gap-2 mb-5">
                    <MapPin size={16} className="mt-0.5 text-gray-400 flex-shrink-0" />
                    {point.address}
                  </p>
                  
                  {point.status !== 'Delivered' && (
                    <button 
                      onClick={() => openPODModal(point)}
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3.5 rounded-xl text-sm font-bold transition shadow-xl shadow-gray-900/20 flex items-center justify-center gap-2"
                    >
                      <Check size={18} strokeWidth={3} />{t("record_proof_of_deli")}</button>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* ─── Premium Map ─── */}
        <div className="lg:col-span-8 h-[360px] sm:h-[450px] lg:h-auto min-h-[320px] rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200 shadow-xl relative bg-gray-100 z-0">
          <MapContainer 
            center={activePoints.length > 0 ? [activePoints[0].lat, activePoints[0].lng] : defaultCenter} 
            zoom={13} 
            scrollWheelZoom={true} 
            className="w-full h-full"
            zoomControl={false}
          >
            {/* Professional CartoDB Voyager Map Tiles */}
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            <MapUpdater points={activePoints} />
            
            {driverLocation && (
              <Marker position={driverLocation} icon={driverIcon} zIndexOffset={2000}>
                <Popup><strong>{t("you_are_here")}</strong></Popup>
              </Marker>
            )}
            
            {pathCoordinates.length > 1 && (
              <Polyline positions={pathCoordinates} color="#3B82F6" weight={5} opacity={0.8} dashArray="10, 10" />
            )}

            {routePoints.map((point, index) => (
              <Marker 
                key={point.order_id} 
                position={[point.lat, point.lng]} 
                icon={point.status === 'Delivered' ? deliveredIcon : activeIcon}
                zIndexOffset={point.status === 'Delivered' ? 0 : 1000}
              >
                <Popup className="custom-popup min-w-[200px]">
                  <div className="p-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">{t("stop")}{index + 1}
                      </span>
                      {point.status === 'Delivered' && <span className="text-[10px] font-bold text-green-600 uppercase">{t("delivered")}</span>}
                    </div>
                    <strong className="text-base text-gray-900 block mb-1">{point.farmer_name}</strong>
                    <span className="text-xs text-gray-500 block mb-3 leading-relaxed">{point.address}</span>
                    
                    {point.status !== 'Delivered' && (
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2 rounded-lg flex justify-center items-center gap-1 transition"
                      >
                        <Navigation size={14} />{t("get_directions")}</a>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          {isOffline && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-gray-900/90 backdrop-blur text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>{t("working from cached ")}</div>
          )}
        </div>

      </div>

      {/* ─── Proof of Delivery Modal ─── */}
      <AnimatePresence>
        {podModal.isOpen && (
          <motion.div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={closePODModal} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900">{t("proof of delivery")}</h2>
                  <p className="text-sm text-gray-500 font-medium">{podModal.order?.farmer_name} • {podModal.order?.order_ref}</p>
                </div>
                <button onClick={closePODModal} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200 hover:bg-gray-50 transition text-gray-500"><X size={18}/></button>
              </div>

              <div className="p-6">
                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                  <button onClick={() => { setSignatureMode(true); stopCamera(); }} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${signatureMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                    <PenTool size={16}/>{t("e_signature")}</button>
                  <button onClick={() => { setSignatureMode(false); startCamera(); }} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${!signatureMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                    <Camera size={16}/>{t("capture_photo")}</button>
                </div>

                {signatureMode ? (
                  <div>
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden relative h-48">
                      <canvas 
                        ref={sigCanvasRef}
                        width={400}
                        height={200}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseOut={stopDrawing}
                        className="w-full h-full cursor-crosshair touch-none"
                        style={{ touchAction: 'none' }}
                      />
                      {!hasSignature && (
                         <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-400 font-medium">{t("sign here")}</div>
                      )}
                    </div>
                    {hasSignature && (
                      <button onClick={clearSignature} className="text-xs font-bold text-red-500 mt-2 hover:underline">{t("clear signature")}</button>
                    )}
                  </div>
                ) : (
                  <div>
                    {!podImage ? (
                      <div className="bg-gray-900 rounded-2xl overflow-hidden relative aspect-video flex items-center justify-center">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                        <button onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-white rounded-full border-4 border-gray-300 shadow-xl flex items-center justify-center hover:scale-105 transition active:scale-95">
                          <div className="w-10 h-10 bg-red-500 rounded-full"></div>
                        </button>
                        <canvas ref={canvasRef} className="hidden" width={640} height={480} />
                      </div>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden shadow-inner border border-gray-200">
                        <img src={podImage} className="w-full object-cover" />
                        <button onClick={() => { setPodImage(null); startCamera(); }} className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 shadow-sm">{t("retake")}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 mt-auto">
                <button 
                  onClick={submitPOD}
                  disabled={signatureMode ? !hasSignature : !podImage}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle size={20} />{t("confirm sync delivery")}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Deliveries;
