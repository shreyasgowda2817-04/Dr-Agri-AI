import { useState, useEffect } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { motion } from 'framer-motion';
import { Video, Calendar, Clock, Star, PhoneCall, FileText, ShoppingCart, CheckCircle, Package } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { addItem, openCart } from '../store/slices/cartSlice';
import api from '../services/api';
import { toast } from 'react-toastify';

const Consultation = () => {
  const [activeCall, setActiveCall] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [experts, setExperts] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const user = useSelector(state => state.auth.user);
  const dispatch = useDispatch();

  useEffect(() => {
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

    fetchExperts();
    if (user) {
      fetchPrescriptions();
      fetchSupplies();
    }
  }, [user]);

  const fulfillPrescription = (prescription) => {
    let addedCount = 0;
    prescription.prescribed_products.forEach(prodId => {
      const prod = supplies.find(s => s.id === prodId);
      if (prod && prod.stock_quantity > 0) {
        dispatch(addItem({ ...prod, quantity: 1 }));
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      dispatch(openCart());
      toast.success(`${addedCount} prescribed items added to your cart!`);
    } else {
      toast.error("Products are currently out of stock or unavailable.");
    }
  };

  const startCall = async (expertId) => {
    if (!user) {
      toast.error("Please log in to consult with an expert");
      return;
    }
    
    // Call the backend to initiate a real session!
    try {
      const res = await api.post('/consultations/call', { expert_id: expertId });
      setRoomName(res.data.room_name);
      setActiveCall(true);
      toast.success("Ringing the expert...");
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect to expert");
    }
  };

  if (activeCall) {
    return (
      <div className="w-full h-[85vh] bg-gray-900 rounded-xl overflow-hidden shadow-2xl border-4 border-gray-800">
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={roomName}
          configOverwrite={{
            startWithAudioMuted: false,
            disableModeratorIndicator: true,
            startScreenSharing: true,
            enableEmailInStats: false
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
          }}
          userInfo={{
            displayName: user ? user.name : 'Farmer'
          }}
          onApiReady={(externalApi) => {
            externalApi.addListener('videoConferenceLeft', () => {
              setActiveCall(false);
            });
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-3xl p-8 md:p-12 text-white mb-12 shadow-xl flex flex-col md:flex-row items-center justify-between">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-extrabold mb-4 flex items-center gap-3">
            <Video className="w-10 h-10 text-blue-300" />
            Live Expert Consultation
          </h1>
          <p className="text-xl text-blue-100 mb-6 leading-relaxed">
            Don't guess. Speak face-to-face with certified agronomists and soil scientists directly from your farm. No downloads required.
          </p>
          <div className="flex gap-4">
            <span className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
              <Clock size={16} /> Available 24/7
            </span>
            <span className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
              <Calendar size={16} /> Book Instantly
            </span>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="w-48 h-48 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)]">
            <PhoneCall className="w-20 h-20 text-white/80" />
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Experts Now</h2>
      
      {loading ? (
        <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {experts.map((expert) => (
            <motion.div 
              key={expert.id}
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col"
            >
              <div className="flex items-start gap-4 mb-4">
                <img src={expert.img} alt={expert.name} className="w-16 h-16 rounded-full object-cover border-2 border-green-100" />
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{expert.name}</h3>
                  <p className="text-sm text-green-600 font-medium">{expert.title}</p>
                  <div className="flex items-center gap-1 mt-1 text-yellow-500">
                    <Star size={14} className="fill-current" />
                    <span className="text-xs font-bold text-gray-600 ml-1">{expert.rating.toFixed(1)} / 5.0</span>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-500 mb-6 space-y-2">
                <p><strong>Speaks:</strong> {expert.lang}</p>
                <p><strong>Consultation Fee:</strong> ₹{expert.price} / 30 mins</p>
              </div>
              
              <button 
                onClick={() => startCall(expert.id)}
                className="mt-auto w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-md hover:shadow-lg"
              >
                <Video size={18} /> Connect Now
              </button>
            </motion.div>
          ))}
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
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">My e-Prescriptions</h2>
              <p className="text-gray-500 text-sm">Treatment plans and product recommendations from your experts.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prescriptions.map((prescription) => (
              <div key={prescription._id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-blue-50 text-blue-700 font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wide">Diagnosis</span>
                  <span className="text-xs font-bold text-gray-400">{new Date(prescription.created_at).toLocaleDateString()}</span>
                </div>
                
                <h3 className="text-xl font-black text-gray-900 mb-2 leading-snug">{prescription.diagnosis}</h3>
                
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                  <p className="text-sm text-gray-700 italic">"{prescription.notes}"</p>
                </div>

                <div className="mb-6 flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Package size={14}/> Recommended Products</p>
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
                              <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded mr-1">OUT</span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-400">No products prescribed.</p>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => fulfillPrescription(prescription)}
                  disabled={prescription.prescribed_products.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-2xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart size={18} /> Fulfill Prescription
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default Consultation;
