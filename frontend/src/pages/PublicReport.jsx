import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import api from '../services/api';
import { defaultUIStrings } from '../utils/uiStrings';
import { toast } from 'react-toastify';

import AnalysisCard from '../components/scan/AnalysisCard';
import DiseaseOverview from '../components/scan/DiseaseOverview';
import TreatmentTable from '../components/scan/TreatmentTable';
import PreventionAndSafety from '../components/scan/PreventionAndSafety';
import AIInsights from '../components/scan/AIInsights';

const PublicReport = () => {
  const { t } = useTranslation();
  

  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [originalResult, setOriginalResult] = useState(null);
  const [uiStrings, setUiStrings] = useState(defaultUIStrings);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      

      try {
        const res = await api.get(`/reports/public/${id}`);
        setResult(res.data);
        setOriginalResult(res.data);
      } catch (err) {
        setError('Report not found or has been removed.');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);


  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-black text-gray-900 mb-4">{error}</h1>
        <Link to="/" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">{t("go_to_dr_agri")}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-12 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[900px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">{t("shared_analysis_repo")}</h1>
          </div>
          
          <select 
            
            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 font-bold shadow-sm"
          >
            <option value="en">{t("_____english")}</option>
            <option value="hi">{t("_____hindi________")}</option>
            <option value="kn">{t("_____kannada________")}</option>
            <option value="te">{t("_____telugu_________")}</option>
            <option value="ta">{t("_____tamil________")}</option>
            <option value="mr">{t("_____marathi________")}</option>
          </select>
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <AnalysisCard result={result} ui={uiStrings} />
            <DiseaseOverview result={result} ui={uiStrings} />
            <AIInsights result={result} ui={uiStrings} />
            <TreatmentTable result={result} ui={uiStrings} />
            <PreventionAndSafety ui={uiStrings} />
          </motion.div>
        )}
        
        <div className="mt-12 text-center">
          <p className="text-gray-500 font-medium mb-4">{t("want_to_scan_your_ow")}</p>
          <Link to="/" className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-all">{t("join_dr_agri_free")}</Link>
        </div>
      </div>
    </div>
  );
};

export default PublicReport;
