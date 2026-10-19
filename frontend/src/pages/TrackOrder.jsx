import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Truck, Sprout, Factory, CheckCircle, Search, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { motion } from 'framer-motion';
import Footer from '../components/layout/Footer';

const TrackOrder = () => {
  const { t } = useTranslation();
  

  const { orderRef } = useParams();
  const [trackingId, setTrackingId] = useState(orderRef || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!orderRef);
  const [error, setError] = useState('');

  useEffect(() => {
    if (orderRef) {
      handleSearch(orderRef);
    }
  }, [orderRef]);

  const handleSearch = async (ref = trackingId) => {
    

    if (!ref.trim()) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await api.get(`/shipping/track/public/${ref}`);
      setData(res.data);
    } catch (err) {
      setError('Order not found or tracking is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconStr) => {
    

    switch (iconStr) {
      case 'Order': return <Package size={24} className="text-blue-500" />;
      case 'Farm': return <Sprout size={24} className="text-emerald-500" />;
      case 'Factory': return <Factory size={24} className="text-purple-500" />;
      case 'Truck': return <Truck size={24} className="text-orange-500" />;
      default: return <CheckCircle size={24} className="text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-100 rounded-full mb-4 shadow-sm text-emerald-600">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{t("food_provenance_trac")}</h1>
          <p className="mt-3 text-lg text-gray-500">{t("track your order")}</p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 mb-8 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
          <Search className="text-gray-400 ml-2" size={20} />
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-lg font-medium text-gray-900 placeholder-gray-400"
            placeholder="Enter Order Number (e.g., ORD-A1B2C3D4)"
            value={trackingId}
            onChange={e => setTrackingId(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
          />
          <button 
            onClick={() => handleSearch()}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition"
          >{t("track")}</button>
        </div>

        {loading && <div className="text-center text-emerald-600 font-bold animate-pulse">{t("scanning_immutable_l")}</div>}
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium border border-red-100">{error}</div>}

        {data && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-8 text-white">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-emerald-100 font-bold uppercase tracking-widest text-sm mb-1">{t("order_details")}</p>
                  <h2 className="text-3xl font-black">{data.order_ref}</h2>
                </div>
                {data.estimated_delivery && (
                  <div className="text-right">
                    <p className="text-emerald-100 font-bold uppercase tracking-widest text-sm mb-1">{t("est__delivery")}</p>
                    <p className="text-xl font-bold">{new Date(data.estimated_delivery).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="p-8 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-sm">{t("verified_contents")}</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {data.items.map((item, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 text-emerald-700 w-10 h-10 rounded-lg flex items-center justify-center font-black">{item.quantity}{t("x")}</div>
                      <p className="font-bold text-gray-900">{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="p-8">
              <h3 className="font-bold text-gray-900 mb-8 uppercase tracking-widest text-sm">{t("provenance timeline")}</h3>
              <div className="relative border-l-2 border-emerald-100 ml-5 space-y-10">
                {data.timeline.map((step, idx) => (
                  <div key={idx} className="relative pl-8">
                    <div className="absolute -left-[1.35rem] bg-white p-1 rounded-full border-2 border-emerald-100 shadow-sm">
                      {getIcon(step.icon)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-400 mb-1">{new Date(step.timestamp).toLocaleString()}</p>
                      <h4 className="text-lg font-black text-gray-900">{step.title}</h4>
                      <p className="text-gray-500 font-medium mt-1">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-900 text-gray-400 p-4 text-center text-xs font-medium">{t("secured by dr agri ai")}</div>
          </motion.div>
        )}
      </div>
      <div className="mt-16">
        <Footer />
      </div>
    </div>
  );
};

export default TrackOrder;
