import { useTranslation } from "react-i18next";
import { motion } from 'framer-motion';
import { Info, Leaf, Bug, Wind, Sprout } from 'lucide-react';

const DiseaseOverview = ({ result, ui }) => {
  const { t } = useTranslation();
  if (!result || !result.recommended_treatment) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-6"
    >
      <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 mb-6">
        <Info className="text-indigo-500" size={24} />
        {ui.overviewTitle}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {result.disease_overview?.description || `${(result.disease_name || 'Unknown').replace(/___/g, ' ')} ${ui.overviewDescPart1} ${result.crop_name || 'Unknown'}. ${ui.overviewDescPart2}`}
          </p>
          
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl mt-1">
                <Bug size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{ui.primaryCauseTitle}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {result.disease_overview?.cause_pathogen || ui.primaryCauseDesc}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl mt-1">
                <Wind size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{ui.spreadMethodTitle}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {result.disease_overview?.spread || ui.spreadMethodDesc}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 text-green-600 rounded-xl mt-1">
                <Sprout size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">{ui.affectedPartsTitle}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {Array.isArray(result.disease_overview?.plant_affected_parts) 
                    ? result.disease_overview.plant_affected_parts.join(', ')
                    : (result.disease_overview?.plant_affected_parts || ui.affectedPartsDesc)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
          <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Leaf className="text-emerald-500" size={16} /> {ui.organicRemediesTitle}
          </h4>
          <ul className="space-y-3">
            {result.recommended_treatment.organic_remedies && result.recommended_treatment.organic_remedies.length > 0 ? (
              result.recommended_treatment.organic_remedies.map((remedy, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span>{remedy}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-gray-500 italic">{ui.noRemedies || "No specific organic remedies required."}</li>
            )}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

export default DiseaseOverview;
