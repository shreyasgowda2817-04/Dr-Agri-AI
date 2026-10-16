import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef, useCallback } from 'react';
import WebRTCVideoCall from '../components/consultation/WebRTCVideoCall';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  PhoneCall, 
  User, 
  FileText, 
  Activity, 
  AlertCircle, 
  ShoppingCart, 
  CheckCircle, 
  Clock, 
  X, 
  Users,
  Calendar,
  Star,
  DollarSign,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Sliders,
  Award
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import api from '../services/api';

const ExpertDashboard = () => {
  const { t } = useTranslation();
  const user = useSelector(state => state.auth.user);

  // Active Tab: 'live' | 'appointments' | 'availability' | 'history' | 'reviews' | 'earnings'
  const [activeTab, setActiveTab] = useState('live');

  // Live Consultation State
  const [activeCall, setActiveCall] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [farmerId, setFarmerId] = useState(null);
  const [activeCallId, setActiveCallId] = useState(null);

  // AI Triage & Crop Scans State
  const [triageData, setTriageData] = useState(null);
  const [loadingTriage, setLoadingTriage] = useState(false);
  const [farmerCrops, setFarmerCrops] = useState([]);
  const [loadingCrops, setLoadingCrops] = useState(false);
  const [selectedCropImage, setSelectedCropImage] = useState(null);

  // Digital Prescription State
  const [prescriptionForm, setPrescriptionForm] = useState({ diagnosis: '', notes: '' });
  const [sendingPrescription, setSendingPrescription] = useState(false);
  const [supplies, setSupplies] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Queue State
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingCallsQueue, setIncomingCallsQueue] = useState([]);
  const [queueLength, setQueueLength] = useState(0);
  const [waitingSince, setWaitingSince] = useState(null);

  // Overview / Stats State
  const [overview, setOverview] = useState({
    total_consultations: 0,
    active_queue_count: 0,
    today_appointments_count: 0,
    average_rating: 5.0,
    total_reviews: 0,
    total_prescriptions: 0,
    fee_per_consultation: 0.0,
    total_earnings: 0.0,
    is_available: true,
    working_hours: { start: '09:00', end: '18:00', timezone: 'Asia/Kolkata' },
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    specializations: ['Crop Pathology', 'Soil Science', 'Pest Management'],
    title: 'Senior Agronomy Specialist',
    bio: 'Certified agricultural expert advising farmers on crop health, soil nutrients, and yield maximization.'
  });
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Appointments / History / Reviews State
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Availability Settings Form State
  const [availabilityForm, setAvailabilityForm] = useState({
    is_available: true,
    working_hours: { start: '09:00', end: '18:00', timezone: 'Asia/Kolkata' },
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    fee_per_consultation: 0.0,
    title: 'Senior Agronomy Specialist',
    specializations: ['Crop Pathology', 'Soil Science', 'Pest Management'],
    bio: ''
  });
  const [savingAvailability, setSavingAvailability] = useState(false);

  // Refs for polling closures
  const activeCallRef = useRef(activeCall);
  const incomingCallRef = useRef(incomingCall);
  const incomingCallsQueueRef = useRef(incomingCallsQueue);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    incomingCallsQueueRef.current = incomingCallsQueue;
  }, [incomingCallsQueue]);

  const fetchOverviewData = useCallback(async () => {
    try {
      const res = await api.get('/consultations/expert/overview');
      if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
        setOverview(prev => ({
          ...prev,
          ...res.data,
          average_rating: typeof res.data.average_rating === 'number' ? res.data.average_rating : (prev.average_rating ?? 5.0),
          total_consultations: typeof res.data.total_consultations === 'number' ? res.data.total_consultations : (prev.total_consultations ?? 0),
          total_earnings: typeof res.data.total_earnings === 'number' ? res.data.total_earnings : (prev.total_earnings ?? 0),
          fee_per_consultation: typeof res.data.fee_per_consultation === 'number' ? res.data.fee_per_consultation : (prev.fee_per_consultation ?? 0),
          today_appointments_count: typeof res.data.today_appointments_count === 'number' ? res.data.today_appointments_count : (prev.today_appointments_count ?? 0),
          total_reviews: typeof res.data.total_reviews === 'number' ? res.data.total_reviews : (prev.total_reviews ?? 0),
          total_prescriptions: typeof res.data.total_prescriptions === 'number' ? res.data.total_prescriptions : (prev.total_prescriptions ?? 0),
          is_available: res.data.is_available ?? prev.is_available ?? true,
        }));
        setAvailabilityForm(prev => ({
          ...prev,
          is_available: res.data.is_available ?? prev.is_available ?? true,
          working_hours: res.data.working_hours || prev.working_hours,
          available_days: res.data.available_days || prev.available_days,
          fee_per_consultation: res.data.fee_per_consultation ?? prev.fee_per_consultation ?? 0,
          title: res.data.title || prev.title,
          specializations: res.data.specializations || prev.specializations,
          bio: res.data.bio || prev.bio
        }));
      }
    } catch (err) {
      console.warn("Could not load expert overview:", err);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const res = await api.get('/consultations/expert/appointments');
      setAppointments(res.data || []);
    } catch (err) {
      console.warn("Could not fetch appointments:", err);
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/consultations/expert/history');
      setHistory(res.data || []);
    } catch (err) {
      console.warn("Could not fetch history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const res = await api.get('/consultations/expert/reviews');
      setReviews(res.data || []);
    } catch (err) {
      console.warn("Could not fetch reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    const fetchSupplies = async () => {
      try {
        const res = await api.get('/marketplace/supplies');
        setSupplies(res.data || []);
      } catch (err) {
        console.error("Failed to fetch supplies", err);
      }
    };
    fetchSupplies();

    if (user) {
      fetchOverviewData();
      fetchAppointments();
      const checkActiveConsultation = async () => {
        try {
          const res = await api.get('/consultations/my-active-call');
          if (res.data?.has_active_call && res.data.call?.status === 'accepted') {
            const c = res.data.call;
            setRoomName(c.room_name);
            setActiveCallId(c.id);
            setActiveCall(c.call_type || 'video');
            setActiveTab('live');
            if (c.farmer_id) {
              setFarmerId(c.farmer_id);
              fetchTriageData(c.farmer_id);
              fetchFarmerCrops(c.farmer_id);
            }
          }
        } catch (e) {}
      };
      checkActiveConsultation();
    }
  }, [user, fetchOverviewData, fetchAppointments]);

  // Unload beacon for expert
  useEffect(() => {
    const handleUnload = () => {
      if (activeCallId && activeCall) {
        const apiUrl = import.meta.env.VITE_API_URL || 'https://dr-agri-ai.onrender.com/api/v1';
        const parsedBase = (apiUrl.startsWith('http://') || apiUrl.startsWith('https://'))
          ? apiUrl.replace(/\/+$/, '')
          : window.location.origin + '/api/v1';
        const beaconUrl = `${parsedBase}/consultations/call/${activeCallId}/leave-beacon`;
        navigator.sendBeacon?.(beaconUrl);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [activeCallId, activeCall]);

  // Tab switch fetcher
  useEffect(() => {
    if (activeTab === 'appointments') fetchAppointments();
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'reviews') fetchReviews();
    if (activeTab === 'earnings') fetchOverviewData();
  }, [activeTab, fetchAppointments, fetchHistory, fetchReviews, fetchOverviewData]);

  // Fetch AI Triage data for patient
  const fetchTriageData = useCallback(async (id) => {
    if (!id) return;
    setLoadingTriage(true);
    try {
      const res = await api.get(`/consultations/triage/${id}`);
      if (res.data) {
        setTriageData(res.data);
        if (res.data.most_common_disease && res.data.most_common_disease !== 'Unknown' && res.data.most_common_disease !== 'None') {
          setPrescriptionForm(prev => ({ ...prev, diagnosis: res.data.most_common_disease }));
        }
      }
    } catch (err) {
      console.error("Failed to load triage data", err);
    } finally {
      setLoadingTriage(false);
    }
  }, []);

  // Fetch Farmer's high-res crop scans
  const fetchFarmerCrops = useCallback(async (id) => {
    if (!id) return;
    setLoadingCrops(true);
    try {
      const res = await api.get(`/consultations/farmer-crops/${id}`);
      setFarmerCrops(res.data || []);
    } catch (err) {
      console.warn("Could not load farmer crops:", err);
    } finally {
      setLoadingCrops(false);
    }
  }, []);

  // Dismiss an incoming call cleanly from queue and active slot
  const dismissIncomingCall = useCallback((callId, reason = null, preserveTriage = false) => {
    setIncomingCallsQueue(prev => {
      const filtered = prev.filter(c => c.id !== callId);
      setQueueLength(filtered.length);

      if (incomingCallRef.current?.id === callId) {
        if (filtered.length > 0) {
          const nextCall = filtered[0];
          setIncomingCall(nextCall);
          setFarmerId(nextCall.farmerId);
          setWaitingSince(new Date(nextCall.createdAt));
          fetchTriageData(nextCall.farmerId);
          fetchFarmerCrops(nextCall.farmerId);
        } else {
          setIncomingCall(null);
          if (!preserveTriage && !activeCallRef.current) {
            setTriageData(null);
            setFarmerCrops([]);
          }
          setWaitingSince(null);
        }
      }
      return filtered;
    });

    if (reason) {
      toast.info(reason);
    }
  }, [fetchTriageData, fetchFarmerCrops]);

  // Register an incoming call into queue and activate if idle
  const registerIncomingCall = useCallback((callData, shouldChime = false) => {
    if (activeCallRef.current) return;
    if (!callData?.id) return;

    const createdTime = callData.createdAt || callData.created_at || new Date().toISOString();
    const callAgeMs = new Date().getTime() - new Date(createdTime).getTime();
    if (callAgeMs >= 95000) return; // Discard expired calls older than 95s

    const normalizedCall = {
      id: callData.id,
      room: callData.room || callData.room_name,
      room_name: callData.room || callData.room_name,
      farmerId: callData.farmerId || callData.farmer_id,
      farmer_id: callData.farmerId || callData.farmer_id,
      farmerName: callData.farmerName || callData.farmer_name || 'Farmer',
      farmer_name: callData.farmerName || callData.farmer_name || 'Farmer',
      callType: callData.callType || callData.call_type || 'video',
      call_type: callData.callType || callData.call_type || 'video',
      createdAt: createdTime,
      created_at: createdTime
    };

    setIncomingCallsQueue(prev => {
      const exists = prev.some(c => c.id === normalizedCall.id);
      if (exists) {
        return prev.map(c => c.id === normalizedCall.id ? { ...c, ...normalizedCall } : c);
      }
      return [...prev, normalizedCall];
    });

    // If no active incoming call, or if this updates the currently shown incoming call
    if (!incomingCallRef.current || incomingCallRef.current.id === normalizedCall.id) {
      setIncomingCall(normalizedCall);
      setFarmerId(normalizedCall.farmerId);
      setWaitingSince(new Date(createdTime));
      fetchTriageData(normalizedCall.farmerId);
      fetchFarmerCrops(normalizedCall.farmerId);
    }

    setQueueLength(prev => Math.max(prev, 1));

    if (shouldChime) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch (e) {}
    }
  }, [fetchTriageData, fetchFarmerCrops]);

  // Real-time Queue Polling Loop (Protected from clearing active calls)
  useEffect(() => {
    if (!user) return;
    let isPolling = true;

    const pollQueue = async () => {
      if (!isPolling) return;
      try {
        const res = await api.get('/consultations/active-calls');
        const calls = res.data || [];
        setQueueLength(calls.length);

        if (calls.length > 0 && !activeCallRef.current) {
          calls.forEach(c => registerIncomingCall(c, false));
        } else if (calls.length === 0 && !activeCallRef.current) {
          // Protected check: DO NOT immediately clear incomingCall
          const currentCall = incomingCallRef.current;
          if (currentCall) {
            const callAgeMs = new Date().getTime() - new Date(currentCall.createdAt).getTime();
            if (callAgeMs >= 95000) {
              dismissIncomingCall(currentCall.id, "Consultation request timed out.");
            } else if (callAgeMs >= 6000) {
              try {
                const statusRes = await api.get(`/consultations/call/${currentCall.id}/status`);
                const status = statusRes.data?.status;
                if (status && status !== 'calling') {
                  const msg = status === 'cancelled'
                    ? 'The farmer cancelled the consultation request.'
                    : status === 'missed'
                    ? 'Consultation request timed out.'
                    : null;
                  dismissIncomingCall(currentCall.id, msg);
                }
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        console.warn("Queue polling check:", err);
      }

      if (isPolling) {
        setTimeout(pollQueue, 3000);
      }
    };

    pollQueue();
    return () => { isPolling = false; };
  }, [user, registerIncomingCall, dismissIncomingCall]);

  // Real-time Push WebSocket with Auto-Reconnect for instant incoming consultation alerts
  useEffect(() => {
    if (!user?.id) return;
    let ws = null;
    let pingInterval = null;
    let reconnectTimeout = null;
    let isMounted = true;

    const connectExpertWs = () => {
      try {
        const path = `/api/v1/consultations/ws/experts/${user.id}`;
        let wsUrl;
        if (import.meta.env.VITE_WS_HOST) {
          const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${proto}//${import.meta.env.VITE_WS_HOST}${path}`;
        } else if (import.meta.env.VITE_API_URL && (import.meta.env.VITE_API_URL.startsWith('http://') || import.meta.env.VITE_API_URL.startsWith('https://'))) {
          try {
            const parsed = new URL(import.meta.env.VITE_API_URL);
            const proto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
            wsUrl = `${proto}//${parsed.host}${path}`;
          } catch (e) {}
        }
        if (!wsUrl) {
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${proto}//${isLocal ? 'localhost:8000' : 'dr-agri-ai.onrender.com'}${path}`;
        }

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!isMounted) return;
          console.log(`Expert WebSocket connected for user ${user.id}`);
          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              try { ws.send("ping"); } catch (e) {}
            }
          }, 15000);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            if (event.data === "pong") return;
            const data = JSON.parse(event.data);
            if (data.type === 'incoming_call' && !activeCallRef.current) {
              registerIncomingCall(data, true);
              toast.info(`Incoming consultation from ${data.farmer_name || 'Farmer'}!`, { autoClose: 6000 });
            } else if (data.type === 'call_cancelled') {
              dismissIncomingCall(data.id, 'The farmer cancelled the consultation request.');
            }
          } catch (e) {}
        };

        ws.onerror = () => {};
        ws.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          if (isMounted) {
            reconnectTimeout = setTimeout(() => {
              if (isMounted) connectExpertWs();
            }, 3000);
          }
        };
      } catch (err) {
        console.warn("Could not connect expert WS:", err);
      }
    };

    connectExpertWs();

    return () => {
      isMounted = false;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        try { ws.close(); } catch (e) {}
      }
    };
  }, [user?.id, registerIncomingCall, dismissIncomingCall]);

  // Wait time counter
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

  // Accept Consultation
  const acceptCall = async (callIdToAccept = null) => {
    const callToAccept = callIdToAccept ? appointments.find(a => a.id === callIdToAccept) || incomingCall : incomingCall;
    if (!callToAccept) return;

    try {
      const res = await api.post(`/consultations/call/${callToAccept.id}/accept`);
      const activeRoom = res.data?.room_name || callToAccept.room || callToAccept.room_name;
      const activeFarmerId = res.data?.farmer_id || callToAccept.farmerId || callToAccept.farmer_id;
      const activeCallType = res.data?.call_type || callToAccept.callType || callToAccept.call_type || 'video';

      setRoomName(activeRoom);
      setFarmerId(activeFarmerId);
      setActiveCallId(callToAccept.id);
      setActiveCall(activeCallType);
      dismissIncomingCall(callToAccept.id, null, true);
      setActiveTab('live');
      toast.success("Consultation connected! Opening live room.");
      fetchTriageData(activeFarmerId);
      fetchFarmerCrops(activeFarmerId);
      fetchAppointments();
      fetchOverviewData();
    } catch (err) {
      const activeRoom = err.response?.data?.room_name || callToAccept.room || callToAccept.room_name;
      const activeFarmerId = err.response?.data?.farmer_id || callToAccept.farmerId || callToAccept.farmer_id;
      if (activeRoom) {
        setRoomName(activeRoom);
        setFarmerId(activeFarmerId);
        setActiveCallId(callToAccept.id);
        setActiveCall(callToAccept.callType || callToAccept.call_type || 'video');
        dismissIncomingCall(callToAccept.id, null, true);
        setActiveTab('live');
        fetchTriageData(activeFarmerId);
        fetchFarmerCrops(activeFarmerId);
      } else {
        toast.error("Failed to connect to consultation room.");
      }
    }
  };

  // Decline Consultation
  const declineCall = async (callIdToDecline = null) => {
    const targetId = callIdToDecline || incomingCall?.id;
    if (!targetId) return;

    try {
      await api.post(`/consultations/call/${targetId}/decline`);
      dismissIncomingCall(targetId, "Consultation request declined.");
      fetchAppointments();
      fetchOverviewData();
    } catch (err) {
      console.error(err);
      dismissIncomingCall(targetId);
    }
  };

  // Mark Consultation Complete
  const handleConsultationEnd = async () => {
    if (activeCallId) {
      try {
        await api.post(`/consultations/call/${activeCallId}/complete`);
      } catch (err) {
        console.warn("Could not mark call completed:", err);
      }
    }
    setActiveCall(false);
    setActiveCallId(null);
    toast.info("Consultation completed. You can issue prescription notes below.");
    fetchOverviewData();
    fetchAppointments();
    fetchHistory();
  };

  // Submit Treatment Record / Prescription
  const submitPrescription = async (e) => {
    e.preventDefault();
    const targetFarmerId = farmerId || triageData?.farmer_id;
    if (!targetFarmerId) {
      toast.error("Please select an active farmer or appointment before submitting prescription.");
      return;
    }
    setSendingPrescription(true);
    try {
      await api.post('/consultations/prescriptions', {
        farmer_id: targetFarmerId,
        diagnosis: prescriptionForm.diagnosis,
        prescribed_products: selectedProducts,
        notes: prescriptionForm.notes
      });
      toast.success("Treatment Record Saved! Sent to Farmer.");
      setPrescriptionForm({ diagnosis: '', notes: '' });
      setSelectedProducts([]);
      fetchOverviewData();
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save treatment record.");
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

  // Toggle Availability Switch
  const toggleAvailabilityQuick = async () => {
    const newStatus = !overview.is_available;
    try {
      await api.put('/consultations/expert/availability', {
        ...availabilityForm,
        is_available: newStatus
      });
      setOverview(prev => ({ ...prev, is_available: newStatus }));
      setAvailabilityForm(prev => ({ ...prev, is_available: newStatus }));
      toast.success(newStatus ? "You are now ONLINE and accepting farmer consultations!" : "You are now OFFLINE. New call requests paused.");
    } catch (err) {
      toast.error("Failed to update availability status.");
    }
  };

  // Save Full Availability Schedule
  const saveSchedule = async (e) => {
    e.preventDefault();
    setSavingAvailability(true);
    try {
      await api.put('/consultations/expert/availability', availabilityForm);
      setOverview(prev => ({
        ...prev,
        is_available: availabilityForm.is_available,
        working_hours: availabilityForm.working_hours,
        available_days: availabilityForm.available_days,
        fee_per_consultation: availabilityForm.fee_per_consultation,
        title: availabilityForm.title,
        specializations: availabilityForm.specializations,
        bio: availabilityForm.bio
      }));
      toast.success("Weekly availability schedule & working hours updated!");
    } catch (err) {
      toast.error("Failed to update schedule.");
    } finally {
      setSavingAvailability(false);
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (day) => {
    setAvailabilityForm(prev => {
      const exists = prev.available_days.includes(day);
      return {
        ...prev,
        available_days: exists 
          ? prev.available_days.filter(d => d !== day)
          : [...prev.available_days, day]
      };
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto p-3 sm:p-6 w-full max-w-full space-y-6">
      
      {/* ─── Top SaaS Hero Header ─── */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-lg">
            <img 
              src={user?.avatar_url || `https://ui-avatars.com/api/?name=${(user?.name || 'Expert').replace(' ', '+')}&background=065f46&color=fff&size=128`} 
              alt={user?.name} 
              className="w-full h-full rounded-xl object-cover"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-300" />
                Verified Agronomist
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                activeCall ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                (overview?.is_available ?? true) ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  activeCall ? 'bg-amber-400 animate-ping' :
                  (overview?.is_available ?? true) ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'
                }`}></span>
                {activeCall ? 'In Live Call' : (overview?.is_available ?? true) ? 'Online • Accepting Calls' : 'Offline'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Dr. {user?.name || 'Agronomy Specialist'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 font-medium mt-1">
              {overview?.title || 'Senior Agricultural Consultant'} • {overview?.working_hours?.start || '09:00'} - {overview?.working_hours?.end || '18:00'} IST
            </p>
          </div>
        </div>

        {/* Quick Actions & Live Status Toggle */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={toggleAvailabilityQuick}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-md ${
              (overview?.is_available ?? true)
                ? 'bg-white text-emerald-900 hover:bg-emerald-50'
                : 'bg-emerald-700/60 text-white hover:bg-emerald-700 border border-white/20'
            }`}
          >
            <Clock size={16} />
            {(overview?.is_available ?? true) ? 'Switch to Offline' : 'Go Online Now'}
          </button>
          <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3 text-white">
            <Users size={16} className={queueLength > 0 ? "text-emerald-400 animate-pulse" : "text-gray-400"} />
            <div>
              <p className="text-[10px] text-gray-300 uppercase tracking-wider font-semibold">Incoming Queue</p>
              <p className="text-xs sm:text-sm font-bold text-white">
                {queueLength === 0 ? "No farmers waiting" : queueLength === 1 ? "1 farmer waiting" : `${queueLength} farmers waiting`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Alert Banner */}
      {!(overview?.is_available ?? true) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-bold">You are currently OFFLINE</p>
              <p className="text-[11px] sm:text-xs text-amber-700">Farmers see you as unavailable. Switch your status to Online to receive live calls.</p>
            </div>
          </div>
          <button
            onClick={toggleAvailabilityQuick}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shrink-0 transition shadow-sm"
          >
            Go Online Now
          </button>
        </div>
      )}

      {/* ─── High-Impact KPI Statistics Row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completed Sessions</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900">{overview?.total_consultations ?? 0}</div>
          <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <Sparkles size={12} /> Real verified consultations
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Appointments</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Calendar size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900">{overview?.today_appointments_count ?? 0}</div>
          <p className="text-xs text-blue-600 font-semibold mt-1">
            {queueLength} in waiting queue
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Farmer Rating</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center font-bold">
              <Star size={20} className="fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 flex items-baseline gap-1">
            {(overview?.average_rating ?? 5.0).toFixed(1)} <span className="text-xs text-gray-400 font-semibold">/ 5.0</span>
          </div>
          <p className="text-xs text-amber-600 font-semibold mt-1">
            Based on {overview?.total_reviews ?? 0} farmer reviews
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estimated Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900">
            ₹{(overview?.total_earnings ?? 0).toLocaleString()}
          </div>
          <p className="text-xs text-teal-600 font-semibold mt-1">
            ₹{overview?.fee_per_consultation ?? 0} per session rate
          </p>
        </div>
      </div>

      {/* ─── Clean Agricultural Tab Navigation ─── */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'live', label: 'Live Consultation & Queue', icon: <Video size={16} />, badge: queueLength > 0 ? queueLength : null },
          { id: 'appointments', label: 'Appointments & Requests', icon: <Calendar size={16} />, badge: appointments.length > 0 ? appointments.length : null },
          { id: 'availability', label: 'Availability & Working Hours', icon: <Clock size={16} /> },
          { id: 'history', label: 'Consultation History', icon: <FileText size={16} /> },
          { id: 'reviews', label: 'Farmer Feedback', icon: <Star size={16} /> },
          { id: 'earnings', label: 'Earnings & Analytics', icon: <DollarSign size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-bold text-xs sm:text-sm rounded-t-xl flex items-center gap-2 whitespace-nowrap transition border-b-2 -mb-[2px] ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60'
                : 'border-transparent text-gray-500 hover:text-emerald-700 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && (
              <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: LIVE CONSULTATION & QUEUE ─── */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
          
          {/* Main Left: Video Room / Interactive Waiting Screen */}
          <div className="lg:col-span-8 bg-gray-900 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col min-h-[420px] sm:min-h-[520px]">
            {activeCall ? (
              <div className="flex-1 flex flex-col h-full w-full">
                <WebRTCVideoCall
                  roomName={roomName}
                  callType={activeCall}
                  currentUser={{
                    id: user?.id,
                    displayName: `Dr. ${user?.name || 'Expert'}`,
                    name: user?.name || 'Expert',
                    role: 'expert'
                  }}
                  peerName={triageData?.farmer_name || 'Farmer'}
                  onEndCall={handleConsultationEnd}
                  isExpert={true}
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80')] bg-cover bg-center">
                <div className="absolute inset-0 bg-gray-950/85 backdrop-blur-md"></div>

                <AnimatePresence>
                  {incomingCall ? (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: -20 }}
                      className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 sm:p-8 rounded-3xl shadow-2xl z-20 w-full max-w-lg flex flex-col relative overflow-hidden mx-4 text-white"
                    >
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 animate-pulse"></div>

                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-12 h-12 ${incomingCall.callType === 'audio' ? 'bg-blue-500' : 'bg-emerald-500'} rounded-2xl flex items-center justify-center shadow-lg shrink-0`}>
                            {incomingCall.callType === 'audio' ? <PhoneCall className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
                          </div>
                          <div>
                            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">{t("farmer_consultation_")}</h3>
                            <p className="text-xs sm:text-sm text-emerald-300 font-medium">
                              {incomingCall.callType === 'audio' ? 'Voice Request' : 'Video Request'} • Wait: {waitTimeStr}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {incomingCallsQueue.length > 1 && (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              +{incomingCallsQueue.length - 1} in queue
                            </span>
                          )}
                          <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            Ringing
                          </span>
                        </div>
                      </div>

                      <div className="bg-black/40 rounded-2xl p-4 mb-4 border border-white/5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t("farmer")}</span>
                          <span className="text-sm text-white font-bold">{triageData?.farmer_name || incomingCall.farmerName || 'Farmer'}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-2.5">
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t("detected_issue")}</span>
                          <span className="text-sm text-amber-400 font-bold">
                            {triageData?.most_common_disease ? triageData.most_common_disease.replace(/___/g, ' ') : (loadingTriage ? 'Loading AI triage analysis...' : 'General Agronomy Consultation')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-2.5">
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t("ai_confidence")}</span>
                          <span className="text-sm text-emerald-400 font-bold">
                            {triageData?.average_confidence ? `${(triageData.average_confidence * 100).toFixed(0)}% Match` : (loadingTriage ? 'Analyzing...' : 'Verified Farmer')}
                          </span>
                        </div>
                      </div>

                      {incomingCallsQueue.length > 1 && (
                        <div className="mb-4">
                          <p className="text-[11px] text-gray-300 font-semibold mb-2">Other queued requests:</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {incomingCallsQueue.map(c => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setIncomingCall(c);
                                  setFarmerId(c.farmerId);
                                  setWaitingSince(new Date(c.createdAt));
                                  fetchTriageData(c.farmerId);
                                  fetchFarmerCrops(c.farmerId);
                                }}
                                className={`text-xs px-2.5 py-1 rounded-xl border transition shrink-0 ${
                                  incomingCall.id === c.id 
                                    ? 'bg-emerald-500/30 border-emerald-400 text-white font-bold' 
                                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                }`}
                              >
                                {c.farmerName} • {c.callType === 'audio' ? 'Voice' : 'Video'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => declineCall()}
                          className="py-3 bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/30 font-bold rounded-xl text-sm transition"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => acceptCall()}
                          className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2"
                        >
                          <Video size={16} />
                          {t("accept_consultation")}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center p-8 max-w-md z-10 text-white">
                      <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/15 backdrop-blur-md">
                        <Clock className="w-10 h-10 text-emerald-400 animate-pulse" />
                      </div>
                      <h3 className="text-2xl font-black mb-2">Standing By For Farmers</h3>
                      <p className="text-sm text-gray-300 leading-relaxed mb-6">
                        Your consultation channel is active and synced with Dr Agri AI triage. Incoming farmer requests will trigger real-time notifications here.
                      </p>
                      <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 px-4 py-2 rounded-full text-xs font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        Auto-refresh active every 3s
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right Side: AI Crop Triage & e-Prescription Action Panel */}
          <div className="lg:col-span-4 bg-white rounded-3xl shadow-sm border border-emerald-100 p-5 sm:p-6 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 leading-none">{t("ai_crop_assessment")}</h2>
                    <p className="text-xs text-gray-500 mt-1">{t("review_diagnostic_da")}</p>
                  </div>
                </div>
                {farmerCrops.length > 0 && (
                  <button
                    onClick={() => setSelectedCropImage(farmerCrops[0])}
                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <ImageIcon size={13} /> View Scans ({farmerCrops.length})
                  </button>
                )}
              </div>

              {loadingTriage ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mb-3"></div>
                  <p className="text-xs font-medium">{t("analyzing_farm_histo")}</p>
                </div>
              ) : triageData ? (
                <div className="space-y-4">
                  {/* Farmer Summary Pill */}
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          <User size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{triageData.farmer_name}</h4>
                          <p className="text-[10px] text-gray-500">{triageData.total_scans} Total Crop Scans</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {triageData.risk_level} Risk
                      </span>
                    </div>

                    <div className="text-xs text-gray-700 mt-3 pt-2.5 border-t border-gray-200/60 flex items-center justify-between">
                      <span className="font-semibold text-gray-500">Suspected Disease:</span>
                      <span className="font-bold text-emerald-800">{triageData.most_common_disease}</span>
                    </div>
                  </div>

                  {/* High-Resolution Scans Thumbnail Strip */}
                  {farmerCrops.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ImageIcon size={13} className="text-emerald-600" /> Authorized Crop Photos
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {farmerCrops.slice(0, 4).map((crop) => (
                          <div
                            key={crop.id}
                            onClick={() => setSelectedCropImage(crop)}
                            className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-emerald-500 shrink-0 transition"
                          >
                            <img src={crop.image_url} alt={crop.crop_name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 hover:bg-transparent transition"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prescription & Treatment Plan Form */}
                  <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 mt-2">
                    <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <ShoppingCart size={14} className="text-emerald-700" />
                      {t("treatment_recommenda")}
                    </h3>

                    <form onSubmit={submitPrescription} className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">
                          {t("confirmed_diagnosis")}
                        </label>
                        <input
                          required
                          type="text"
                          value={prescriptionForm.diagnosis}
                          onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })}
                          className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="e.g. Tomato Early Blight"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">
                          {t("recommended_products")}
                        </label>
                        <div className="bg-white border border-gray-200 rounded-xl p-2 max-h-28 overflow-y-auto custom-scrollbar space-y-1">
                          {supplies.map((prod) => (
                            <div
                              key={prod.id}
                              onClick={() => toggleProduct(prod.id)}
                              className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition text-xs border ${
                                selectedProducts.includes(prod.id)
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                  : 'hover:bg-gray-50 border-transparent text-gray-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedProducts.includes(prod.id)}
                                readOnly
                                className="w-3.5 h-3.5 text-emerald-600 rounded"
                              />
                              <span className="font-semibold truncate flex-1">{prod.name}</span>
                              <span className="text-[10px] text-gray-500 font-bold">₹{prod.price}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">
                          {t("treatment_notes")}
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={prescriptionForm.notes}
                          onChange={(e) => setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })}
                          placeholder="Apply 2L/acre in the evening or spray copper fungicide every 7 days..."
                          className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={sendingPrescription}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {sendingPrescription ? (
                          <span className="animate-pulse">{t("saving_record___")}</span>
                        ) : (
                          <>
                            <CheckCircle size={15} />
                            Save Send To Farme
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-gray-400 text-center px-4">
                  <AlertCircle size={40} className="mb-3 text-emerald-200" />
                  <p className="font-bold text-sm text-gray-600">Awaiting Consultation</p>
                  <p className="text-xs text-gray-400 mt-1">When an incoming call is received or selected, AI diagnostic triage and prescription controls will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: APPOINTMENTS & REQUESTS ─── */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-gray-900">Upcoming Consultations & Active Queue</h2>
              <p className="text-xs text-gray-500 mt-0.5">Real-time appointments booked by farmers across India</p>
            </div>
            <button
              onClick={fetchAppointments}
              className="self-start sm:self-auto px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <RefreshCw size={13} className={loadingAppointments ? "animate-spin" : ""} /> Refresh List
            </button>
          </div>

          {loadingAppointments ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mx-auto mb-3"></div>
              <p className="text-xs text-gray-500 font-semibold">Loading appointments from database...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Calendar size={48} className="mx-auto mb-3 text-gray-300" />
              <h4 className="text-base font-bold text-gray-700">No Pending Consultation Requests</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                All requests have been answered. Keep your status Online to receive incoming direct video and voice consultations.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appointments.map((apt) => (
                <div key={apt.id} className="bg-emerald-50/30 rounded-2xl p-5 border border-emerald-100 hover:shadow-md transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <img src={apt.farmer_avatar} alt={apt.farmer_name} className="w-12 h-12 rounded-xl object-cover border border-emerald-200" />
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{apt.farmer_name}</h4>
                          <p className="text-[11px] text-gray-500">{apt.farmer_location}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        apt.status === 'calling' ? 'bg-red-100 text-red-700 animate-pulse' :
                        apt.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {apt.status}
                      </span>
                    </div>

                    <div className="bg-white rounded-xl p-3 border border-emerald-100/60 mb-4 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Reported Issue:</span>
                        <span className="font-bold text-gray-900 text-right truncate max-w-[150px]">{apt.crop_issue}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Call Mode:</span>
                        <span className="font-bold text-emerald-800 capitalize">{apt.call_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Requested:</span>
                        <span className="text-gray-600">{new Date(apt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {apt.status === 'calling' ? (
                      <>
                        <button
                          onClick={() => declineCall(apt.id)}
                          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => acceptCall(apt.id)}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow flex items-center justify-center gap-1.5"
                        >
                          <Video size={14} /> Accept Call
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setRoomName(apt.room_name);
                          setFarmerId(apt.farmer_id);
                          setActiveCallId(apt.id);
                          setActiveCall(apt.call_type || 'video');
                          setActiveTab('live');
                          fetchTriageData(apt.farmer_id);
                          fetchFarmerCrops(apt.farmer_id);
                        }}
                        className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow flex items-center justify-center gap-1.5"
                      >
                        <Video size={14} /> Reconnect Call Room
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: AVAILABILITY & WORKING HOURS ─── */}
      {activeTab === 'availability' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-sm max-w-4xl space-y-6">
          <div className="pb-4 border-b border-gray-100">
            <h2 className="text-xl font-black text-gray-900">Working Hours & Availability Management</h2>
            <p className="text-xs text-gray-500 mt-1">Configure your online presence, working shift hours, active days, and consultation fee.</p>
          </div>

          <form onSubmit={saveSchedule} className="space-y-6">
            {/* Live Toggle */}
            <div className="flex items-center justify-between p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <div>
                <h4 className="text-sm font-bold text-gray-900">Online Availability Status</h4>
                <p className="text-xs text-gray-500 mt-0.5">When online, your profile is listed as Available 24/7 on the farmer consultation page.</p>
              </div>
              <button
                type="button"
                onClick={() => setAvailabilityForm(prev => ({ ...prev, is_available: !prev.is_available }))}
                className={`w-14 h-8 rounded-full transition-colors p-1 flex items-center ${
                  availabilityForm.is_available ? 'bg-emerald-600 justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-white shadow-md"></div>
              </button>
            </div>

            {/* Daily Working Shift */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Shift Start Time</label>
                <input
                  type="time"
                  value={availabilityForm.working_hours?.start || '09:00'}
                  onChange={(e) => setAvailabilityForm({
                    ...availabilityForm,
                    working_hours: { ...availabilityForm.working_hours, start: e.target.value }
                  })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Shift End Time</label>
                <input
                  type="time"
                  value={availabilityForm.working_hours?.end || '18:00'}
                  onChange={(e) => setAvailabilityForm({
                    ...availabilityForm,
                    working_hours: { ...availabilityForm.working_hours, end: e.target.value }
                  })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Days Available */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Available Consultation Days</label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => {
                  const isChecked = availabilityForm.available_days?.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                        isChecked
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fee Per Consultation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Consultation Fee (₹ INR / session)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={availabilityForm.fee_per_consultation}
                  onChange={(e) => setAvailabilityForm({ ...availabilityForm, fee_per_consultation: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-gray-500 font-medium">Set 0 for free community agronomist sessions</span>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Professional Title</label>
                <input
                  type="text"
                  value={availabilityForm.title}
                  onChange={(e) => setAvailabilityForm({ ...availabilityForm, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Senior Plant Pathologist"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Expert Bio & Advisory Philosophy</label>
              <textarea
                rows={3}
                value={availabilityForm.bio}
                onChange={(e) => setAvailabilityForm({ ...availabilityForm, bio: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Describe your background, crops of expertise, and how you assist farmers..."
              />
            </div>

            <button
              type="submit"
              disabled={savingAvailability}
              className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm transition shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={18} />
              {savingAvailability ? 'Saving Settings...' : 'Save Availability Schedule'}
            </button>
          </form>
        </div>
      )}

      {/* ─── TAB 4: CONSULTATION HISTORY & PRESCRIPTIONS ─── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-gray-900">Historical Consultations & Treatments</h2>
              <p className="text-xs text-gray-500 mt-0.5">Log of completed video sessions, issued prescriptions, and farmer outcomes</p>
            </div>
            <button
              onClick={fetchHistory}
              className="self-start sm:self-auto px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
            >
              <RefreshCw size={13} className={loadingHistory ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mx-auto mb-3"></div>
              <p className="text-xs text-gray-500 font-semibold">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FileText size={48} className="mx-auto mb-3 text-gray-300" />
              <h4 className="text-base font-bold text-gray-700">No Past Consultations Yet</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Completed consultations and digital prescription records will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-50/50 text-emerald-900 font-bold uppercase tracking-wider border-b border-emerald-100">
                    <th className="p-3.5 rounded-l-xl">Farmer</th>
                    <th className="p-3.5">Diagnosis / Treatment</th>
                    <th className="p-3.5">Mode</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Rating</th>
                    <th className="p-3.5 rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-3.5 font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                          {item.farmer_name?.[0] || 'F'}
                        </div>
                        {item.farmer_name}
                      </td>
                      <td className="p-3.5 font-medium text-gray-700">{item.diagnosis}</td>
                      <td className="p-3.5 text-gray-600 capitalize font-medium">{item.call_type}</td>
                      <td className="p-3.5 text-gray-500">{new Date(item.created_at).toLocaleDateString()}</td>
                      <td className="p-3.5">
                        {item.rating ? (
                          <span className="flex items-center gap-1 text-amber-500 font-bold">
                            <Star size={13} className="fill-current" /> {item.rating}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Unrated</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          item.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: FARMER FEEDBACK & REVIEWS ─── */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-gray-900">Farmer Reviews & Ratings</h2>
              <p className="text-xs text-gray-500 mt-0.5">Authentic feedback submitted after completed video & voice consultations</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} className={s <= Math.round(overview?.average_rating ?? 5.0) ? "fill-current" : "text-gray-300"} />
                ))}
              </div>
              <span className="font-black text-sm text-gray-900">{(overview?.average_rating ?? 5.0).toFixed(1)}</span>
            </div>
          </div>

          {loadingReviews ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600 mx-auto mb-3"></div>
              <p className="text-xs text-gray-500 font-semibold">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Star size={48} className="mx-auto mb-3 text-gray-300" />
              <h4 className="text-base font-bold text-gray-700">No Reviews Submitted Yet</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                After each consultation concludes, farmers are invited to submit genuine star ratings and feedback here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-emerald-50/20 rounded-2xl p-5 border border-emerald-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center text-yellow-400 gap-0.5">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <Star key={st} size={14} className={st <= rev.rating ? "fill-current" : "text-gray-300"} />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400 font-semibold">{new Date(rev.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-700 italic leading-relaxed mb-4">"{rev.comment}"</p>
                  </div>
                  <div className="pt-3 border-t border-emerald-100/60 flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-900">{rev.farmer_name}</span>
                    <span className="text-[10px] text-gray-500">{rev.farmer_location}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 6: EARNINGS & REVENUE ANALYTICS ─── */}
      {activeTab === 'earnings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-sm space-y-6">
          <div className="pb-4 border-b border-gray-100">
            <h2 className="text-xl font-black text-gray-900">Earnings & Financial Analytics</h2>
            <p className="text-xs text-gray-500 mt-1">Real-time revenue metrics calculated directly from your completed consultations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-md">
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider block mb-1">Total Payout Accumulated</span>
              <div className="text-3xl font-black">₹{(overview?.total_earnings ?? 0).toLocaleString()}</div>
              <p className="text-xs text-emerald-200 mt-2">Calculated from {overview?.total_consultations ?? 0} completed farmer sessions</p>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block mb-1">Standard Session Rate</span>
              <div className="text-3xl font-black text-gray-900">₹{overview?.fee_per_consultation ?? 0}</div>
              <p className="text-xs text-gray-600 mt-2">Adjustable anytime under Availability & Schedule</p>
            </div>

            <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block mb-1">Prescriptions Authored</span>
              <div className="text-3xl font-black text-gray-900">{overview?.total_prescriptions ?? 0}</div>
              <p className="text-xs text-gray-600 mt-2">Treatment records linked to Dr Agri AI marketplace</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Crop Diagnostic Image Viewer Modal ─── */}
      {selectedCropImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedCropImage(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
                {selectedCropImage.crop_name} Diagnostic Scan
              </span>
              <span className="text-xs font-semibold text-gray-500">
                {new Date(selectedCropImage.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="h-72 w-full rounded-2xl overflow-hidden bg-gray-900 mb-4 border border-gray-100 shadow-inner">
              <img
                src={selectedCropImage.image_url}
                alt={selectedCropImage.crop_name}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Identified Pathology:</span>
                <span className="text-base font-bold text-emerald-900">{selectedCropImage.disease_name}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Model Confidence:</span>
                <span className="text-sm font-bold text-emerald-600">
                  {((selectedCropImage.confidence || 0.9) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setSelectedCropImage(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
              >
                Close Viewer
              </button>
              <button
                onClick={() => {
                  setPrescriptionForm(prev => ({ ...prev, diagnosis: selectedCropImage.disease_name }));
                  setSelectedCropImage(null);
                  setActiveTab('live');
                  toast.success(`Diagnosis auto-filled: ${selectedCropImage.disease_name}`);
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition shadow"
              >
                Apply to Prescription
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExpertDashboard;
