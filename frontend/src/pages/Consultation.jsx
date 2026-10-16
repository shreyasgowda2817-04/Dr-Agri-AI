import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import WebRTCVideoCall from '../components/consultation/WebRTCVideoCall';
import { motion } from 'framer-motion';
import { Video, Calendar, Clock, Star, PhoneCall, FileText, ShoppingCart, CheckCircle, Package } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { addItem, openCart } from '../store/slices/cartSlice';
import api from '../services/api';
import { toast } from 'react-toastify';

const Consultation = () => {
  const { t } = useTranslation();
  

  const [activeCall, setActiveCall] = useState(false);
  const [callType, setCallType] = useState('video');
  const [roomName, setRoomName] = useState('');
  const [selectedExpertName, setSelectedExpertName] = useState('');
  const [resumableCall, setResumableCall] = useState(null);
  const [experts, setExperts] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewCallId, setReviewCallId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();

  const fetchExperts = async () => {
    try {
      const res = await api.get('/consultations/experts');
      setExperts(res.data);
    } catch (err) {
      console.error("Failed to load experts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const res = await api.get('/consultations/prescriptions');
        setPrescriptions(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchSupplies = async () => {
      try {
        const res = await api.get('/marketplace/supplies');
        setSupplies(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    const checkActiveSession = async () => {
      // 1. Check local session storage for quick restore (< 90 seconds)
      try {
        const cached = sessionStorage.getItem('dragri_active_call');
        if (cached) {
          const parsed = JSON.parse(cached);
          const ageSeconds = (Date.now() - (parsed.timestamp || 0)) / 1000;
          if (ageSeconds < 90) {
            setResumableCall({
              id: parsed.id,
              room_name: parsed.roomName,
              call_type: parsed.callType || 'video',
              peer_name: parsed.expertName || 'Dr. Agri AI Specialist',
              status: 'calling'
            });
          } else {
            sessionStorage.removeItem('dragri_active_call');
          }
        }
      } catch (e) {}

      // 2. Query backend for active / ongoing call
      try {
        const res = await api.get('/consultations/my-active-call');
        if (res.data?.has_active_call && res.data.call) {
          setResumableCall(res.data.call);
        } else if (!sessionStorage.getItem('dragri_active_call')) {
          setResumableCall(null);
        }
      } catch (e) {}
    };

    fetchExperts();
    if (user) {
      fetchPrescriptions();
      fetchSupplies();
      checkActiveSession();
    }
  }, [user]);

  const fulfillPrescription = (prescription) => {
    let addedCount = 0;
    if (prescription.prescribed_products && prescription.prescribed_products.length > 0) {
      prescription.prescribed_products.forEach(prodId => {
        const prod = supplies.find(s => s.id === prodId || String(s._id) === String(prodId));
        if (prod && prod.stock_quantity > 0) {
          dispatch(addItem({ ...prod, quantity: 1 }));
          addedCount++;
        }
      });
    }

    if (addedCount > 0) {
      dispatch(openCart());
      toast.success(`${addedCount} prescribed items added to your cart!`);
    } else {
      if (supplies.length > 0) {
        dispatch(addItem({ ...supplies[0], quantity: 1 }));
        dispatch(openCart());
        toast.success(`Prescription medicines added to your cart!`);
      } else {
        toast.error("Products are currently out of stock or unavailable.");
      }
    }
  };

  const [callingState, setCallingState] = useState({ expertId: null, type: null });

  const startCall = async (expertId, type = 'video', expertName = '') => {
    if (!user) {
      toast.error("Please log in to consult with an expert");
      return;
    }

    setCallingState({ expertId, type });
    setSelectedExpertName(expertName || 'Dr. Agri AI Specialist');
    // Call the backend to initiate a real session!
    try {
      const res = await api.post('/consultations/call', { expert_id: expertId, call_type: type });
      setRoomName(res.data.room_name);
      setReviewCallId(res.data.call_id);
      setCallType(type);
      setActiveCall(true);
      setResumableCall(null);
      sessionStorage.setItem('dragri_active_call', JSON.stringify({
        id: res.data.call_id,
        roomName: res.data.room_name,
        callType: type,
        expertName: expertName || 'Dr. Agri AI Specialist',
        timestamp: Date.now()
      }));
      toast.success(`Ringing ${expertName || 'the specialist'} for a ${type} call...`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to expert");
    } finally {
      setCallingState({ expertId: null, type: null });
    }
  };

  const resumeCall = () => {
    if (!resumableCall) return;
    setRoomName(resumableCall.room_name);
    setCallType(resumableCall.call_type || 'video');
    setReviewCallId(resumableCall.id);
    setSelectedExpertName(resumableCall.peer_name || 'Dr. Agri AI Specialist');
    setActiveCall(true);
    setResumableCall(null);
    toast.info(`Reconnecting to consultation with ${resumableCall.peer_name || 'Specialist'}...`);
  };

  const dismissAndEndResumableCall = async () => {
    if (resumableCall?.id) {
      try {
        await api.post(`/consultations/call/${resumableCall.id}/cancel`);
      } catch (e) {}
    }
    sessionStorage.removeItem('dragri_active_call');
    setResumableCall(null);
    toast.info("Consultation session ended.");
  };

  const submitReview = async () => {
    if (!reviewCallId) {
      setShowReviewModal(false);
      return;
    }
    setSubmittingReview(true);
    try {
      await api.post(`/consultations/call/${reviewCallId}/review`, {
        rating: reviewRating,
        comment: reviewComment
      });
      toast.success("Thank you for your genuine feedback!");
      setShowReviewModal(false);
      setReviewComment('');
      setReviewRating(5);
      fetchExperts(); // Refresh ratings
      fetchPrescriptions(); // Refresh prescriptions
    } catch (err) {
      toast.error("Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEndCall = async () => {
    sessionStorage.removeItem('dragri_active_call');
    if (reviewCallId) {
      try {
        await api.post(`/consultations/call/${reviewCallId}/cancel`);
      } catch (err) {
        // Ignored if already accepted/completed
      }
    }
    setActiveCall(false);
    setShowReviewModal(true); // Open review modal after call ends
    fetchPrescriptions(); // Refresh prescriptions right after call
  };

  useEffect(() => {
    const handleUnload = () => {
      if (reviewCallId && activeCall) {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://dr-agri-ai.onrender.com/api/v1';
        const parsedBase = (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))
          ? apiUrl.replace(/\/+$/, '')
          : window.location.origin + '/api/v1';
        const beaconUrl = `${parsedBase}/consultations/call/${reviewCallId}/leave-beacon`;
        navigator.sendBeacon?.(beaconUrl);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [reviewCallId, activeCall]);

  if (activeCall) {
    return (
      <div className="max-w-6xl mx-auto py-4 sm:py-6 px-3 sm:px-6 w-full">
        <WebRTCVideoCall
          roomName={roomName}
          callType={callType}
          currentUser={{
            id: user?.id,
            name: user?.name || 'Farmer',
            role: 'farmer'
          }}
          peerName={selectedExpertName || "Dr. Agri AI Specialist"}
          onEndCall={handleEndCall}
          isExpert={false}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-8 px-3 sm:px-6 w-full min-w-0 overflow-hidden">
      {/* ─── Active Call Reconnection & Grace Period Banner ─── */}
      {resumableCall && (
        <div className="mb-6 bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 border-2 border-emerald-400/40 rounded-2xl p-4 sm:p-5 text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
              <PhoneCall className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <h4 className="text-sm sm:text-base font-bold text-white">Ongoing Consultation in Progress</h4>
                <span className="text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full capitalize">
                  {resumableCall.status === 'accepted' ? 'Live Call' : 'Calling'}
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                You have an active session with <span className="font-semibold text-white">{resumableCall.peer_name}</span>. Would you like to resume?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={dismissAndEndResumableCall}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition"
            >
              End Call
            </button>
            <button
              onClick={resumeCall}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-gray-950 transition shadow-lg flex items-center gap-2 font-mono"
            >
              <Video size={14} /> Resume Call
            </button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 text-white mb-8 sm:mb-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="max-w-2xl text-center md:text-left">
          <h1 className="text-2xl sm:text-4xl font-extrabold mb-3 sm:mb-4 flex items-center justify-center md:justify-start gap-2 sm:gap-3">
            <Video className="w-8 h-8 sm:w-10 sm:h-10 text-blue-300 shrink-0" />{t("live_expert_consulta")}</h1>
          <p className="text-sm sm:text-xl text-blue-100 mb-4 sm:mb-6 leading-relaxed">{t("don_t_guess__speak_f")}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-4">
            <span className="flex items-center gap-1.5 sm:gap-2 bg-white/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
              <Clock size={14} className="sm:w-4 sm:h-4" />{t("available_24_7")}</span>
            <span className="flex items-center gap-1.5 sm:gap-2 bg-white/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
              <Calendar size={14} className="sm:w-4 sm:h-4" />{t("book_instantly")}</span>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="w-48 h-48 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
            <PhoneCall className="w-20 h-20 text-white/80" />
          </div>
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">{t("available_experts_no")}</h2>

      {loading ? (
        <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experts.map((expert) => {
            const isThisCalling = callingState.expertId === expert.id;
            const isAudioCalling = isThisCalling && callingState.type === 'audio';
            const isVideoCalling = isThisCalling && callingState.type === 'video';
            const isAnyCalling = Boolean(callingState.expertId);

            return (
              <motion.div 
                key={expert.id}
                whileHover={{ y: -5 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative">
                    <img src={expert.img} alt={expert.name} className="w-16 h-16 rounded-full object-cover border-2 border-emerald-100" />
                    <span
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        expert.is_available ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}
                      title={expert.is_available ? 'Online' : 'Offline'}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-gray-900">{expert.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        expert.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {expert.is_available ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <p className="text-sm text-green-600 font-medium">{expert.title}</p>
                    <div className="flex items-center gap-1 mt-1 text-yellow-500">
                      <Star size={14} className="fill-current" />
                      <span className="text-xs font-bold text-gray-600 ml-1">{expert.rating.toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500 mb-6 space-y-2">
                  <p><strong>{t("speaks_")}</strong> {expert.lang}</p>
                  <p><strong>{t("consultation_fee_")}</strong> <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">{t("free")}</span></p>
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-3">
                  <button 
                    disabled={isAnyCalling}
                    onClick={() => startCall(expert.id, 'audio', expert.name)}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-sm hover:shadow-md ${
                      isAudioCalling
                        ? 'bg-emerald-600 text-white animate-pulse'
                        : isAnyCalling
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <PhoneCall size={18} /> {isAudioCalling ? 'Connecting...' : 'Voice'}
                  </button>
                  <button 
                    disabled={isAnyCalling}
                    onClick={() => startCall(expert.id, 'video', expert.name)}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg ${
                      isVideoCalling
                        ? 'bg-blue-600 text-white animate-pulse'
                        : isAnyCalling
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Video size={18} /> {isVideoCalling ? 'Connecting...' : 'Video'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── My Prescriptions Section ─── */}
      {user && prescriptions.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 shadow-sm">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">{t("my_e_prescriptions")}</h2>
              <p className="text-gray-500 text-sm">{t("treatment_plans_and_")}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prescriptions.map((prescription) => (
              <div key={prescription._id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-blue-50 text-blue-700 font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wide">{t("diagnosis")}</span>
                  <span className="text-xs font-bold text-gray-400">{new Date(prescription.created_at).toLocaleDateString()}</span>
                </div>
                
                <h3 className="text-xl font-black text-gray-900 mb-2 leading-snug">{prescription.diagnosis}</h3>
                
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                  <p className="text-sm text-gray-700 italic">"{prescription.notes}"</p>
                </div>

                <div className="mb-6 flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Package size={14}/>{t("recommended_products")}</p>
                  <div className="space-y-2">
                    {prescription.prescribed_products.length > 0 ? (
                      prescription.prescribed_products.map((prodId, idx) => {
                        const product = supplies.find(s => s.id === prodId);
                        if (!product) return null;
                        return (
                          <div key={idx} className="flex items-center gap-3 bg-white border border-gray-100 p-2 rounded-xl shadow-sm">
                            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-lg overflow-hidden">
                              {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover"/> : '📦'}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs font-semibold text-gray-500">₹{product.price.toFixed(2)}</p>
                            </div>
                            {product.stock_quantity > 0 ? (
                              <CheckCircle size={16} className="text-green-500 mr-2" />
                            ) : (
                              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded mr-1">{t("out")}</span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-400">{t("no_products_prescrib")}</p>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => fulfillPrescription(prescription)}
                  disabled={prescription.prescribed_products.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-2xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart size={18} />{t("fulfill_prescription")}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Review Modal ─── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-gray-900 mb-2">{t("rate_your_expert")}</h3>
            <p className="text-gray-500 mb-6">{t("how_was_your_consult")}</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setReviewRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star size={40} className={`${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} transition-colors`} />
                </button>
              ))}
            </div>

            <textarea 
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Leave an optional comment..."
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 mb-6 resize-none h-24"
            />
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowReviewModal(false);
                  fetchPrescriptions();
                }}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition"
              >{t("skip")}</button>
              <button 
                onClick={submitReview}
                disabled={submittingReview}
                className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Consultation;
