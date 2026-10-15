import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, User, FileText, Activity, AlertCircle, ShoppingCart, CheckCircle, Clock, X, Users } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../services/api';

const ExpertDashboard = () => {
  const { t } = useTranslation();
  

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

  // Queue State
  const [incomingCall, setIncomingCall] = useState(null);
  const [queueLength, setQueueLength] = useState(0);
  const [waitingSince, setWaitingSince] = useState(null);

  // Refs for polling closure
  const activeCallRef = useRef(activeCall);
  const incomingCallRef = useRef(incomingCall);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
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

    let isPolling = true;
    
    const pollQueue = async () => {
      

      if (!isPolling) return;
      try {
        const res = await api.get('/consultations/active-calls');
        const calls = res.data || [];
        setQueueLength(calls.length);
        
        if (calls.length > 0 && !activeCallRef.current) {
          const nextCall = calls[0]; // FIFO from backend
          
          if (!incomingCallRef.current || incomingCallRef.current.id !== nextCall.id) {
            setIncomingCall({
              id: nextCall.id,
              room: nextCall.room_name,
              farmerId: nextCall.farmer_id,
              callType: nextCall.call_type || 'video',
              createdAt: nextCall.created_at
            });
            setWaitingSince(new Date(nextCall.created_at));
            fetchTriageData(nextCall.farmer_id);
          }
        } else if (calls.length === 0 && !activeCallRef.current) {
          setIncomingCall(null);
          // Only clear triage if we aren't displaying one
          if (!incomingCallRef.current) setTriageData(null);
        }
      } catch (err) {
        console.error("Polling error", err);
      }

      if (isPolling) {
        setTimeout(pollQueue, 3000);
      }
    };
    
    pollQueue();
    
    return () => { isPolling = false; };
  }, [user]);

  // Update wait time every second
  const [waitTimeStr, setWaitTimeStr] = useState('0:00');
  useEffect(() => {
    if (!waitingSince) return;
    const interval = setInterval(() => {
      const seconds = Math.floor((new Date() - waitingSince) / 1000);
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      setWaitTimeStr(`${m}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [waitingSince]);

  const fetchTriageData = async (id) => {
    

    setLoadingTriage(true);
    try {
      const res = await api.get(`/consultations/triage/${id}`);
      setTriageData(res.data);
      if (res.data.most_common_disease !== 'Unknown') {
        setPrescriptionForm(prev => ({ ...prev, diagnosis: res.data.most_common_disease }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTriage(false);
    }
  };

  const acceptCall = async () => {
    

    if (!incomingCall) return;
    try {
      await api.post(`/consultations/call/${incomingCall.id}/accept`);
      setRoomName(incomingCall.room);
      setFarmerId(incomingCall.farmerId);
      setActiveCall(incomingCall.callType);
      setIncomingCall(null);
    } catch (err) {
      if (err.response?.status === 400) {
         toast.error("Consultation was cancelled or accepted by another expert.");
         setIncomingCall(null);
      } else {
         toast.error("Failed to connect to consultation room.");
      }
    }
  };

  const declineCall = async () => {
    

    if (!incomingCall) return;
    try {
      await api.post(`/consultations/call/${incomingCall.id}/decline`);
      setIncomingCall(null);
      setTriageData(null);
    } catch (err) {
      console.error(err);
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
      toast.success("Treatment Record Saved! Sent to Farmer.");
      setPrescriptionForm({ diagnosis: '', notes: '' });
      setSelectedProducts([]);
    } catch (err) {
      toast.error("Failed to save treatment record.");
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

  // Completion logic
  const handleConsultationEnd = () => {
    

    setActiveCall(false);
    setTriageData(null);
    toast.info("Consultation completed. Fetching next farmer...");
  };

  return (
    <div className="h-[90vh] flex gap-6 max-w-[1600px] mx-auto p-4">
      {/* Left Column: Video Room / Waiting Queue */}
      <div className="flex-1 bg-gray-900 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
        
        {/* Queue Status Header */}
        <div className="absolute top-4 right-4 z-30 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2 text-white shadow-sm">
          <Users size={14} className={queueLength > 0 ? "text-emerald-400" : "text-gray-400"} />
          <span className="text-xs font-bold tracking-wide">
            {queueLength === 0 ? "No farmers waiting" : 
             queueLength === 1 ? "1 farmer waiting" : 
             `${queueLength} farmers waiting`}
          </span>
        </div>

        {activeCall ? (
          <div className="flex-1">
            <JitsiMeeting
              domain="meet.jit.si"
              roomName={roomName}
              spinner={() => (
                <div className="flex flex-col items-center justify-center h-full w-full bg-[#111827] text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-lg font-bold">{t("connecting_you_to_th")}</p>
                  <p className="text-sm text-gray-400 mt-2 text-center">{t("establishing_secure_")}<br/>{t("please_wait_")}</p>
                </div>
              )}
              configOverwrite={{ 
                startWithAudioMuted: false,
                startWithVideoMuted: activeCall === 'audio',
                startScreenSharing: false
              }}
              userInfo={{ displayName: `Dr. ${user?.name || 'Expert'}` }}
              onApiReady={(externalApi) => {
                externalApi.addListener('videoConferenceLeft', handleConsultationEnd);
              }}
              getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; iframeRef.style.width = '100%'; }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80')] bg-cover bg-center">
            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm"></div>
            
            <AnimatePresence>
              {incomingCall && triageData && (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: -20 }}
                  className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl z-20 w-full max-w-md flex flex-col relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500 animate-pulse"></div>
                  
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${incomingCall.callType === 'audio' ? 'bg-blue-500' : 'bg-emerald-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
                        {incomingCall.callType === 'audio' ? <PhoneCall className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">{t("farmer_consultation_")}</h3>
                        <p className="text-sm text-emerald-300 font-medium">{incomingCall.callType === 'audio' ? 'Voice Request' : 'Video Request'}{t("__wait_")}{waitTimeStr}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-2xl p-4 mb-6 border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t("farmer")}</span>
                      <span className="text-sm text-white font-medium">{triageData.farmer_name}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-white/5 pt-3">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t("detected_issue")}</span>
                      <span className="text-sm text-amber-400 font-bold">{triageData.most_common_disease.replace(/___/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-white/5 pt-3">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t("ai_confidence")}</span>
                      <span className="text-sm text-emerald-400 font-bold">{(triageData.average_confidence * 100).toFixed(0)}{t("__match")}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={declineCall}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 border border-white/10"
                    >
                      <X size={18} />{t("decline")}</button>
                    <button 
                      onClick={acceptCall}
                      className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
                    >
                      {incomingCall.callType === 'audio' ? <PhoneCall size={18} /> : <Video size={18} />}{t("accept_consultation")}</button>
                  </div>
                </motion.div>
              )}

              {!incomingCall && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="z-10 flex flex-col items-center text-center max-w-sm"
                >
                  <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 border border-gray-700">
                    <Activity size={32} className="text-emerald-500/50" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t("no_farmers_are_waiti")}</h3>
                  <p className="text-gray-400">{t("when_a_farmer_reques")}</p>
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
              <h2 className="text-lg font-bold text-gray-900 leading-none">{t("ai_crop_assessment")}</h2>
              <p className="text-sm text-gray-500 mt-1">{t("review_diagnostic_da")}</p>
            </div>
          </div>

          {loadingTriage ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p>{t("analyzing_farm_histo")}</p>
            </div>
          ) : triageData ? (
            <div className="flex-1 flex flex-col gap-5 overflow-y-auto custom-scrollbar pr-2 pb-4">
              
              {/* Farmer Profile */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{triageData.farmer_name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><FileText size={12}/> {triageData.total_scans}{t("total_scans")}</p>
                  </div>
                </div>
                {triageData.farm_details ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t("location")}</p>
                        <p className="text-xs font-bold text-gray-800 truncate" title={`${triageData.farm_details.village}, ${triageData.farm_details.state}`}>
                          {triageData.farm_details.village}, {triageData.farm_details.state}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t("farm_size")}</p>
                        <p className="text-xs font-bold text-gray-800">{triageData.farm_details.total_acreage}{t("acres")}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">{t("no_profile_data_avai")}</p>
                )}
              </div>

              {/* AI Summary */}
              {triageData && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100/50 shadow-inner">
                  <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wide mb-2 flex items-center gap-2"><Activity size={14} />{t("diagnostic_summary")}</h3>
                  <p className="text-sm text-indigo-900/80 leading-relaxed font-medium mb-3">{triageData.ai_recommendation_summary}</p>
                  
                  {triageData.environmental_factors && (
                    <div className="flex gap-4 border-t border-indigo-100 pt-3 mt-1">
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">{t("local_humidity")}</p>
                        <p className="text-xs font-bold text-indigo-900">{triageData.environmental_factors.humidity}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">{t("ai_forecast")}</p>
                        <p className="text-xs font-bold text-indigo-900 truncate">{triageData.environmental_factors.forecast}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Scans (Images) */}
              {triageData?.recent_scans?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2"><Clock size={14} />{t("recent_field_scans")}</h3>
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
              <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 mt-auto">
                <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wide mb-4 flex items-center gap-2"><ShoppingCart size={14} />{t("treatment_recommenda")}</h3>
                <form onSubmit={submitPrescription} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">{t("confirmed_diagnosis")}</label>
                    <input 
                      required
                      type="text" 
                      value={prescriptionForm.diagnosis}
                      onChange={e => setPrescriptionForm({...prescriptionForm, diagnosis: e.target.value})}
                      className="w-full bg-white text-gray-900 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">{t("recommended_products")}</label>
                    <div className="bg-white border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto custom-scrollbar flex flex-col gap-1 shadow-inner">
                      {supplies.length === 0 ? (
                        <p className="text-xs text-gray-400 p-2 text-center">{t("loading_marketplace_")}</p>
                      ) : (
                        supplies.map(prod => (
                          <div 
                            key={prod.id} 
                            onClick={() => toggleProduct(prod.id)}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition border ${selectedProducts.includes(prod.id) ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
                          >
                            <input 
                              type="checkbox" 
                              checked={selectedProducts.includes(prod.id)} 
                              readOnly
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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
                    <label className="text-xs font-bold text-gray-600 block mb-1">{t("treatment_notes")}</label>
                    <textarea 
                      required
                      rows={2}
                      value={prescriptionForm.notes}
                      onChange={e => setPrescriptionForm({...prescriptionForm, notes: e.target.value})}
                      placeholder="e.g. Apply 2L/acre in the evening..."
                      className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={sendingPrescription}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-sm transition shadow-md flex items-center justify-center gap-2"
                  >
                    {sendingPrescription ? <span className="animate-pulse">{t("saving_record___")}</span> : <><CheckCircle size={16} />{t("save___send_to_farme")}</>}
                  </button>
                </form>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 px-6 text-center">
              <AlertCircle size={48} className="mb-4 text-gray-200" />
              <p className="font-medium text-gray-500">{t("awaiting_consultatio")}</p>
              <p className="text-sm mt-2">{t("when_you_accept_a_fa")}</p>
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
