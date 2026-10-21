import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  Cpu, 
  MapPin, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Percent,
  Activity,
  FileBadge
} from 'lucide-react';

const AnalysisCard = ({ result, ui }) => {
  const { t } = useTranslation();
  const [showDifferentialDetails, setShowDifferentialDetails] = useState(false);

  if (!result) return null;

  const rawCropName = result.crop_name || result.crop?.name || 'Unknown Crop';
  const rawDiseaseName = (result.disease_name || result.diagnosis?.disease_name || 'Unknown Condition').replace(/___/g, ' ');
  const variety = result.crop?.variety || result.crop_variety;
  const growthStage = result.crop?.growth_stage || result.growth_stage;
  const plotName = result.farm_plot_name || result.plot_name;
  const scanId = result.scan_id || result.id || result._id ? `SCAN-${String(result.scan_id || result.id || result._id).slice(-8).toUpperCase()}` : 'SCAN-RECORD';

  const confidenceScore = Number(result.confidence_score || result.diagnosis?.confidence || 85.0).toFixed(1);
  const severity = String(result.severity || result.diagnosis?.severity || 'Medium');
  const affectedArea = result.affected_area_percentage || result.diagnosis?.affected_area_percentage || 16.0;
  const category = (result.disease_category || result.diagnosis?.disease_category || 'fungal').toLowerCase();
  const differentialDiagnoses = result.differential_diagnoses || result.diagnosis?.differential_diagnoses || [];
  const evidenceNotes = result.evidence_notes || result.diagnosis?.evidence_notes || result.disease_overview?.description;
  const uncertaintyWarning = result.uncertainty_warning || (confidenceScore < 70 ? "AI pattern confidence is moderate. Visual symptoms share characteristics with secondary foliar stress; consult an agronomist before chemical intervention." : null);

  const diagnosticStatus = (result.diagnostic_status || (result.status === 'uncertain_crop' ? 'needs_retake' : 'preliminary')).toLowerCase();

  // Status Badge configurations
  const getStatusBadge = () => {
    switch (diagnosticStatus) {
      case 'expert_confirmed':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <CheckCircle2 size={14} className="text-emerald-600" />,
          label: 'Confirmed by Agronomist'
        };
      case 'needs_retake':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <AlertTriangle size={14} className="text-amber-600" />,
          label: 'Needs Another Image'
        };
      case 'unavailable':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <ShieldAlert size={14} className="text-rose-600" />,
          label: 'Analysis Unavailable'
        };
      case 'preliminary':
      default:
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: <Sparkles size={14} className="text-indigo-600" />,
          label: 'Preliminary AI Assessment'
        };
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
      case 'moderate':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
      case 'mild':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'bacterial':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Bacterial Blight / Spot' };
      case 'fungal':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Fungal Infection' };
      case 'viral':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Viral Infection' };
      case 'pest':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pest Infestation' };
      case 'nutrient_deficiency':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Nutrient Deficiency' };
      case 'abiotic_stress':
        return { bg: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Abiotic / Physiological' };
      default:
        return { bg: 'bg-gray-50 text-gray-700 border-gray-200', label: 'Plant Pathology' };
    }
  };

  const statusInfo = getStatusBadge();
  const categoryInfo = getCategoryBadge(category);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/60 rounded-bl-full -z-10 pointer-events-none" />

      {/* ── TOP METADATA BAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-gray-100 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.bg}`}>
            {statusInfo.icon}
            <span>{statusInfo.label}</span>
          </span>

          {/* Category Badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${categoryInfo.bg}`}>
            <Layers size={13} />
            <span>{categoryInfo.label}</span>
          </span>

          {/* Farm Plot (if linked) */}
          {plotName && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-700 border border-gray-200">
              <MapPin size={12} className="text-emerald-600" />
              <span>{plotName}</span>
            </span>
          )}
        </div>

        {/* Scan ID & Model Version */}
        <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
          <span className="font-mono bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 text-gray-600 font-bold">
            {scanId}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-gray-500">
            <Cpu size={13} className="text-indigo-500" />
            <span>{result.model_info?.model_id || 'Gemini 2.5'} (v2.5)</span>
          </span>
        </div>
      </div>

      {/* ── PRIMARY DIAGNOSIS HEADER ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
          <span>{rawCropName}</span>
          {variety && <span className="text-gray-400">• Var. {variety}</span>}
          {growthStage && <span className="text-gray-400">• {growthStage}</span>}
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight leading-tight">
          {rawDiseaseName}
        </h2>

        {evidenceNotes && (
          <p className="mt-3 text-sm text-gray-600 leading-relaxed max-w-3xl">
            {evidenceNotes}
          </p>
        )}
      </div>

      {/* ── METRIC GRID ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Model Match Confidence */}
        <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">AI Pattern Match</span>
            <Percent size={14} className="text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              {confidenceScore}<span className="text-sm font-bold text-gray-400">%</span>
            </div>
            <span className="text-[10px] text-gray-400 font-medium">Foliar biomarker similarity</span>
          </div>
        </div>

        {/* Severity Level */}
        <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Estimated Severity</span>
            <Activity size={14} className="text-indigo-500" />
          </div>
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold border ${getSeverityBadge(severity)}`}>
              {severity}
            </span>
            <p className="text-[10px] text-gray-400 mt-1 font-medium">Pathogen progression stage</p>
          </div>
        </div>

        {/* Affected Leaf Area */}
        <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Affected Area</span>
            <Layers size={14} className="text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">
              ~{affectedArea}<span className="text-sm font-bold text-gray-400">%</span>
            </div>
            <span className="text-[10px] text-gray-400 font-medium">Visual foliar coverage</span>
          </div>
        </div>

        {/* Timestamp */}
        <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Observation Time</span>
            <Clock size={14} className="text-blue-500" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900 truncate">
              {new Date(result.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <span className="text-[10px] text-gray-400 font-medium">
              {new Date(result.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* ── UNCERTAINTY WARNING (if applicable) ── */}
      {uncertaintyWarning && (
        <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200/70 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-bold">Diagnostic Uncertainty Note: </strong>
            {uncertaintyWarning}
          </div>
        </div>
      )}

      {/* ── DIFFERENTIAL DIAGNOSES (Alternative conditions) ── */}
      {differentialDiagnoses && differentialDiagnoses.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowDifferentialDetails(!showDifferentialDetails)}
            className="w-full flex items-center justify-between py-2 text-xs font-bold text-gray-700 hover:text-indigo-600 transition"
          >
            <div className="flex items-center gap-2">
              <FileBadge size={15} className="text-indigo-500" />
              <span>Differential Diagnoses & Alternative Considerations ({differentialDiagnoses.length})</span>
            </div>
            {showDifferentialDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <AnimatePresence>
            {showDifferentialDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3 space-y-2.5"
              >
                {differentialDiagnoses.map((diff, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-900">{diff.condition}</span>
                      {diff.confidence && (
                        <span className="font-mono text-gray-500 font-semibold">{diff.confidence}% likelihood</span>
                      )}
                    </div>
                    {diff.distinguishing_factors && (
                      <p className="text-gray-500 leading-relaxed">
                        <strong className="text-gray-700">Distinguishing marker: </strong>{diff.distinguishing_factors}
                      </p>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default AnalysisCard;
