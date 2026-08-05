import { motion } from 'framer-motion';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

const PreventionAndSafety = ({ ui }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="grid grid-cols-1 gap-6 mt-6"
    >
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 mb-6">
          <ShieldCheck className="text-indigo-500" size={24} />
          {ui.preventionTitle}
        </h3>
        <ul className="space-y-3">
          {ui.tips.map((tip, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center mt-0.5">
                <span className="text-xs font-black text-indigo-600">{idx + 1}</span>
              </div>
              <p className="text-sm font-medium text-gray-700">{tip}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 mb-6">
          <AlertTriangle className="text-amber-500" size={24} />
          {ui.safetyTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
            <h4 className="font-bold text-gray-900 text-sm">{ui.ppeTitle}</h4>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              {ui.ppeDesc}
            </p>
          </div>
          
          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
            <h4 className="font-bold text-gray-900 text-sm">{ui.rainTitle}</h4>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              {ui.rainDesc}
            </p>
          </div>

          <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
            <h4 className="font-bold text-gray-900 text-sm">{ui.childTitle}</h4>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              {ui.childDesc}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PreventionAndSafety;
