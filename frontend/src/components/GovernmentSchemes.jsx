import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import { Landmark, ArrowRight, ExternalLink } from 'lucide-react';
import api from '../services/api';

const GovernmentSchemes = ({ user }) => {
  const { t } = useTranslation();
  

  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchemes = async () => {
      

      try {
        // We use the farmer's farm details if available, else fallback
        const acres = parseFloat(user?.farm_details?.total_acreage) || 2.0;
        const state = user?.farm_details?.state || "Karnataka";
        
        const res = await api.post('/schemes/recommend', {
          land_area_acres: acres,
          state: state
        });
        setSchemes(res.data);
      } catch (err) {
        console.error("Failed to fetch schemes", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchSchemes();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse mt-6">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm mt-6">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <Landmark className="text-amber-500" size={20} />
          <h3 className="font-bold text-gray-900 dark:text-white">{t("recommended_govt_sch")}</h3>
        </div>
        <span className="text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800/50">{t("personalized")}</span>
      </div>

      <div className="p-3">
        {schemes.length === 0 ? (
          <p className="text-sm text-gray-500 p-4 text-center">{t("no_schemes_found_for")}</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {schemes.map((scheme, i) => (
              <div key={i} className="group p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 transition bg-white dark:bg-gray-800 hover:shadow-md flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{scheme.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{scheme.description}</p>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">{t("eligibility_")}{scheme.eligibility.substring(0, 20)}...</span>
                  <a 
                    href={scheme.apply_link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition"
                  >{t("apply")}<ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GovernmentSchemes;
