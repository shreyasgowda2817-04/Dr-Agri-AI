import { useTranslation } from "react-i18next";
import { motion } from 'framer-motion';
import { FlaskConical } from 'lucide-react';

const TreatmentTable = ({ result, ui }) => {
  const { t } = useTranslation();
  if (!result || !result.recommended_treatment?.pesticides) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-6"
    >
      <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 mb-6">
        <FlaskConical className="text-indigo-500" size={24} />
        {ui.chemicalTitle}
      </h3>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase font-black text-gray-400 tracking-wider">
            <tr>
              <th className="px-6 py-4">{ui.col1}</th>
              <th className="px-6 py-4">{ui.col2}</th>
              <th className="px-6 py-4">{ui.col3}</th>
              <th className="px-6 py-4">{ui.col4}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.recommended_treatment.pesticides && result.recommended_treatment.pesticides.length > 0 ? (
              result.recommended_treatment.pesticides.map((pesticide, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-bold text-gray-900">
                    {typeof pesticide === 'object' ? (
                      <div>
                        <span>{pesticide.name}</span>
                        {pesticide.category && (
                          <span className="block text-xs font-semibold text-indigo-600 mt-0.5">{pesticide.category}</span>
                        )}
                      </div>
                    ) : pesticide}
                  </td>
                  <td className="px-6 py-4">
                    {typeof pesticide === 'object' ? pesticide.method || ui.sprayMethod : ui.sprayMethod}
                  </td>
                  <td className="px-6 py-4">
                    {typeof pesticide === 'object' ? pesticide.dosage || ui.dosage : ui.dosage}
                  </td>
                  <td className="px-6 py-4 text-amber-600 font-bold">
                    {typeof pesticide === 'object' ? pesticide.waiting_period || ui.waitingDays : ui.waitingDays}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-400 italic">
                  No chemical treatments required for this diagnosis.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default TreatmentTable;
