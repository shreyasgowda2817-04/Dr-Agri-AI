import { useState, useEffect } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, User, FileText, Activity, AlertCircle, ShoppingCart, CheckCircle, Clock } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../services/api';

const ExpertDashboard = () => {
  const [activeCall, setActiveCall] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [farmerId, setFarmerId] = useState(null);
  const [triageData, setTriageData] = useState(null);
  const [loadingTriage, setLoadingTriage] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({ diagnosis: '', notes: '' });
  const [sendingPrescription, setSendingPrescription] = useState(false);
  
  const [supplies, setSupplies] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const user = useSelector(state => state.auth.user);

  // Poll for incoming calls or set room name manually (for MVP, we just let them type it or join a known room)
  // In a real socket.io setup, this would listen for rings. 
  // For MVP, we provide a mock incoming call button to simulate picking up a call.
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    // Fetch marketplace supplies for the prescription form
    const fetchSupplies = async () => {
      try {
        const res = await api.get('/marketplace/supplies');
        setSupplies(res.data);
      } catch (err) {
        console.error("Failed to fetch supplies", err);
      }
    };
    fetchSupplies();

    if (!user) return;

    // Use WebSocket for instant real-time call notifications
    const wsUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('http', 'ws') + `/consultations/ws/experts/${user.id}`
      : `ws://localhost:8000/api/v1/consultations/ws/experts/${user.id}`;
      
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'incoming_call') {
        setIncomingCall({
          id: data.id,
          room: data.room_name,
          farmerId: data.farmer_id
        });
      }
    };
    
    return () => ws.close();
  }, [user]);

  const acceptCall = async () => {
    if (!incomingCall) return;
    
    try {
      await api.post(`/consultations/call/${incomingCall.id}/accept`);
    } catch (err) {
      console.error("Failed to accept on backend", err);
    }
    
    setRoomName(incomingCall.room);
    setFarmerId(incomingCall.farmerId);
    setActiveCall(true);
    fetchTriageData(incomingCall.farmerId);
    setIncomingCall(null);
  };

  const fetchTriageData = async (id) => {
    setLoadingTriage(true);
    try {
      const res = await api.get(`/consultations/triage/${id}`);
      setTriageData(res.data);
      // Pre-fill diagnosis if AI found something
      if (res.data.most_common_disease !== 'Unknown') {
        setPrescriptionForm(prev => ({ ...prev, diagnosis: res.data.most_common_disease }));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load farmer triage data");
    } finally {
      setLoadingTriage(false);
    }
  };

  const submitPrescription = async (e) => {
    e.preventDefault();
    setSendingPrescription(true);
    try {
      await api.post('/consultations/prescriptions', {
        farmer_id: farmerId,
        diagnosis: prescriptionForm.diagnosis,
        prescribed_products: selectedProducts, 
        notes: prescriptionForm.notes
      });
      toast.success("Prescription Sent to Farmer's Cart!");
      setPrescriptionForm({ diagnosis: '', notes: '' });
      setSelectedProducts([]);
    } catch (err) {
      toast.error("Failed to send prescription");
    } finally {
      setSendingPrescription(false);
    }
  };

  const toggleProduct = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  return (
    <div className="h-[90vh] flex gap-6 max-w-[1600px] mx-auto p-4">
      {/* Left Column: Video Room */}
      <div className="flex-1 bg-gray-900 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
        {activeCall ? (
          <div className="flex-1">
            <JitsiMeeting
              domain="meet.jit.si"
              roomName={roomName}
              configOverwrite={{ startWithAudioMuted: false }}
              userInfo={{ displayName: `Dr. ${user?.name || 'Expert'}` }}
              onApiReady={(externalApi) => {
                externalApi.addListener('videoConferenceLeft', () => setActiveCall(false));
              }}
              getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; iframeRef.style.width = '100%'; }}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-900/20"></div>
            <Video className="w-24 h-24 text-blue-400 mb-6 opacity-50" />
            <h2 className="text-3xl font-extrabold mb-2 z-10">Expert Telehealth Portal</h2>
            <p className="text-blue-200 mb-8 max-w-md z-10">Waiting for incoming calls from farmers. Stay online to maintain your availability score.</p>
            
            <AnimatePresence>
              {incomingCall && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-2xl z-20 flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-pulse mb-4 shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                    <PhoneCall className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">Incoming Consultation</h3>
                  <p className="text-sm text-gray-300 mb-6">Farmer ID: {incomingCall.farmerId.slice(-6).toUpperCase()}</p>
                  <button 
                    onClick={acceptCall}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <Video size={18} /> Accept & Join Room
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Right Column: AI Triage Sidebar */}
      <div className="w-[450px] flex flex-col gap-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-none">AI Triage Dashboard</h2>
              <p className="text-sm text-gray-500 mt-1">Real-time Farmer Health Data</p>
            </div>
          </div>

          {activeCall && farmerId ? (
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              
              {/* Patient Info */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2"><User size={14} /> Caller Profile</h3>
                {loadingTriage ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ) : triageData ? (
                  <>
                    <p className="font-bold text-gray-900 text-lg mb-1">{triageData.farmer_name}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 text-center">
                        <p className="text-xs text-gray-400 font-bold mb-1">Total Scans</p>
                        <p className="text-xl font-black text-blue-600">{triageData.total_scans}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 text-center">
                        <p className="text-xs text-gray-400 font-bold mb-1">Issue</p>
                        <p className="text-sm font-bold text-red-500 truncate px-1" title={triageData.most_common_disease}>{triageData.most_common_disease}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No profile data available.</p>
                )}
              </div>

              {/* AI Summary */}
              {triageData && (
                <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wide mb-2 flex items-center gap-2"><FileText size={14} /> AI Pre-Diagnosis</h3>
                  <p className="text-sm text-blue-900/80 leading-relaxed">{triageData.ai_recommendation_summary}</p>
                </div>
              )}

              {/* Recent Scans (Images) */}
              {triageData?.recent_scans?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2"><Clock size={14} /> Recent Field Scans</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    {triageData.recent_scans.map((scan, i) => (
                      <div key={i} className="min-w-[120px] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex-shrink-0">
                        <img src={scan.image_url} alt="Crop Scan" className="w-full h-20 object-cover" />
                        <div className="p-2 text-center">
                          <p className="text-[10px] font-bold text-gray-900 truncate" title={scan.disease_name.replace(/___/g, ' ')}>{scan.disease_name.replace(/___/g, ' ')}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{new Date(scan.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prescription Form */}
              <div className="bg-green-50/50 rounded-2xl p-4 border border-green-100 mt-auto">
                <h3 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-4 flex items-center gap-2"><ShoppingCart size={14} /> Issue e-Prescription</h3>
                <form onSubmit={submitPrescription} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Confirmed Diagnosis</label>
                    <input 
                      required
                      type="text" 
                      value={prescriptionForm.diagnosis}
                      onChange={e => setPrescriptionForm({...prescriptionForm, diagnosis: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Recommended Products</label>
                    <div className="bg-white border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto custom-scrollbar flex flex-col gap-1 shadow-inner">
                      {supplies.length === 0 ? (
                        <p className="text-xs text-gray-400 p-2 text-center">Loading marketplace...</p>
                      ) : (
                        supplies.map(prod => (
                          <div 
                            key={prod.id} 
                            onClick={() => toggleProduct(prod.id)}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition border ${selectedProducts.includes(prod.id) ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
                          >
                            <input 
                              type="checkbox" 
                              checked={selectedProducts.includes(prod.id)} 
                              readOnly
                              className="w-4 h-4 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                            />
                            <div className="flex-1 overflow-hidden">
                              <p className="text-xs font-bold text-gray-900 truncate leading-tight">{prod.name}</p>
                              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">₹{prod.price.toFixed(2)} • {prod.category}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Treatment Notes</label>
                    <textarea 
                      required
                      rows={2}
                      value={prescriptionForm.notes}
                      onChange={e => setPrescriptionForm({...prescriptionForm, notes: e.target.value})}
                      placeholder="e.g. Apply 2L/acre in the evening..."
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={sendingPrescription}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg text-sm transition shadow-md flex items-center justify-center gap-2"
                  >
                    {sendingPrescription ? <span className="animate-pulse">Sending...</span> : <><CheckCircle size={16} /> Send to Farmer Cart</>}
                  </button>
                </form>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 px-6 text-center">
              <AlertCircle size={48} className="mb-4 text-gray-200" />
              <p className="font-medium text-gray-500">No active patient.</p>
              <p className="text-sm mt-2">When a farmer calls, their complete crop history and AI diagnostic summary will automatically load here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple phone call icon component since it might not be in lucide react version
const PhoneCall = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

export default ExpertDashboard;
