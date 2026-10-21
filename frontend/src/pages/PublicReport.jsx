import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import api from '../services/api';
import { defaultUIStrings } from '../utils/uiStrings';
import { toast } from 'react-toastify';

import AnalysisCard from '../components/scan/AnalysisCard';
import VisualAnalysis from '../components/scan/VisualAnalysis';
import DiseaseOverview from '../components/scan/DiseaseOverview';
import AIInsights from '../components/scan/AIInsights';
import TreatmentTable from '../components/scan/TreatmentTable';
import RecoveryPlan from '../components/scan/RecoveryPlan';
import RecoveryTracker from '../components/scan/RecoveryTracker';
import PreventionAndSafety from '../components/scan/PreventionAndSafety';

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
        <Link to="/" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">
          {t("go_to_dr_agri")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-8 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1000px] mx-auto">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
              <Sparkles size={14} />
              <span>Public Agronomy Diagnostic Report</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              {t("shared_analysis_repo")}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Verified pathology biomarkers and 4-stage agronomic recovery protocol.
            </p>
          </div>
          
          <Link
            to="/scan"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:border-indigo-300 hover:text-indigo-600 rounded-xl shadow-xs transition"
          >
            <ArrowLeft size={14} />
            <span>Scan Another Crop</span>
          </Link>
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 1. Primary Diagnosis & Severity */}
            <AnalysisCard result={result} ui={uiStrings} />

            {/* 2. Foliar Visual Inspection */}
            <VisualAnalysis result={result} />

            {/* 3. Deep Disease Profile & Causal Pathogen */}
            <DiseaseOverview result={result} ui={uiStrings} />

            {/* 4. Real-time Weather Context & Verified Spray Window */}
            <AIInsights result={result} ui={uiStrings} />

            {/* 5. Safe Treatment Engine */}
            <TreatmentTable result={result} ui={uiStrings} />

            {/* 6. 4-Stage Recovery Roadmap */}
            <RecoveryPlan result={result} ui={uiStrings} />

            {/* 7. Recovery Milestones History (Read-only for public view) */}
            <RecoveryTracker result={result} readOnly={true} />

            {/* 8. Prevention & Safety */}
            <PreventionAndSafety ui={uiStrings} />
          </motion.div>
        )}
        
        {/* Bottom CTA */}
        <div className="mt-12 text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Want to diagnose your own crops with Dr Agri AI?</h3>
          <p className="text-gray-500 text-xs sm:text-sm font-medium mb-5 max-w-md mx-auto">
            Get instant pathogen identification, microclimate-verified spray windows, and active ingredient recommendations.
          </p>
          <Link 
            to="/scan" 
            className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5"
          >
            {t("join dr.agri for free scans")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PublicReport;
