import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Package, Truck, CheckCircle, Clock, MapPin, 
  ArrowLeft, Search, AlertTriangle, Box
} from 'lucide-react';
import api from '../services/api';

const OrderTracking = () => {
  const { t } = useTranslation();
  

  const { orderId } = useParams();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTracking = async () => {
      

      try {
        setLoading(true);
        // Using the public tracking endpoint from backend
        const res = await api.get(`/shipping/track/public/${orderId}`);
        setTrackingData(res.data);
        setError('');
      } catch (err) {
        console.error("Failed to fetch tracking data", err);
        setError(err.response?.data?.detail || "Could not find tracking information for this order.");
      } finally {
        setLoading(false);
      }
    };
    
    if (orderId) {
      fetchTracking();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
        <p className="text-gray-500 font-bold tracking-widest uppercase text-sm">{t("locating_shipment___")}</p>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white rounded-2xl shadow-sm border border-red-100 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">{t("tracking_not_found")}</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/marketplace" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition">
          <ArrowLeft size={18} />{t("back_to_marketplace")}</Link>
      </div>
    );
  }

  const getStatusColor = (status) => {
    

    switch (status?.toLowerCase()) {
      case 'delivered': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'in_transit': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'processing': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getIcon = (iconStr) => {
    

    switch (iconStr) {
      case 'Order': return <Package size={20} />;
      case 'Transit': return <Truck size={20} />;
      case 'Delivered': return <CheckCircle size={20} />;
      default: return <Clock size={20} />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/marketplace" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t("order_tracking")}</h1>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">{t("ref_")}{trackingData.order_ref}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Tracking Timeline */}
        <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-900">{t("shipment_journey")}</h2>
            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${getStatusColor(trackingData.current_status)}`}>
              {trackingData.current_status}
            </span>
          </div>

          <div className="relative pl-4 border-l-2 border-gray-100 ml-4 space-y-8">
            {trackingData.timeline.map((event, index) => (
              <div key={index} className={`relative ${event.completed ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`absolute -left-[43px] p-2 rounded-full border-4 border-white ${event.completed ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {getIcon(event.icon)}
                </div>
                <div className="pl-6">
                  <h3 className="font-bold text-gray-900 text-lg">{event.title}</h3>
                  <p className="text-gray-500 text-sm mt-1">{event.description}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
                    {new Date(event.timestamp).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shipment Details Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{t("carrier_info")}</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-600">
                <Truck size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-900">{trackingData.carrier}</p>
                <p className="text-xs text-gray-500">{t("logistics_partner")}</p>
              </div>
            </div>
            
            {trackingData.tracking_number && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t("tracking_number")}</p>
                <p className="font-mono font-bold text-gray-900">{trackingData.tracking_number}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{t("delivery_estimate")}</h3>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <MapPin size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  {trackingData.estimated_delivery 
                    ? new Date(trackingData.estimated_delivery).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
                    : 'Pending Estimate'}
                </p>
                <p className="text-xs text-gray-500 mt-1">{t("to_")}{trackingData.shipping_address?.split('|')[0] || "Your Address"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
