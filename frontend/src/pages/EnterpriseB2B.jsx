import { useState, useEffect } from 'react';
import { Building2, Handshake, ShieldCheck, Leaf, Tractor, Activity } from 'lucide-react';
import api from '../services/api';
import { motion } from 'framer-motion';

const EnterpriseB2B = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchB2BData = async () => {
      try {
        const res = await api.get('/b2b/partners');
        setPartners(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchB2BData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center gap-3">
          <Building2 className="w-10 h-10 text-emerald-600" />
          Enterprise Smart Contracts
        </h1>
        <p className="text-gray-500 mt-3 text-lg">Direct, transparent B2B sourcing. Lock in bulk prices early by analyzing farm health scores.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          {partners.map((partner, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={partner.id} 
              className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 flex justify-between items-center text-white">
                <div>
                  <h2 className="text-2xl font-black">{partner.name}</h2>
                  <p className="text-gray-400 font-medium flex items-center gap-2 mt-1"><Tractor size={16}/> {partner.organization_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Farm Health Score</p>
                  <p className={`text-3xl font-black ${partner.farm_health_score >= 85 ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {partner.farm_health_score}/100
                  </p>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-sm flex items-center gap-2">
                  <Leaf size={16} className="text-emerald-500" /> Available Harvests
                </h3>
                
                <div className="space-y-4">
                  {partner.available_crops.map((crop, cIdx) => (
                    <div key={cIdx} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex justify-between items-center hover:shadow-md transition">
                      <div>
                        <p className="font-bold text-lg text-gray-900">{crop.name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Activity size={14} className="text-blue-500"/>
                          Disease Risk: <span className={crop.disease_risk === 'Low' ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>{crop.disease_risk}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-xl text-gray-900">{crop.volume_tons} <span className="text-sm text-gray-500 font-medium">Tons</span></p>
                        <button className="mt-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-emerald-200 transition flex items-center gap-1">
                          <Handshake size={14} /> Bid Contract
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-500"/> Verified by Dr Agri AI Ledger
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnterpriseB2B;
