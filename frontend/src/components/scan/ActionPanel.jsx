import { useTranslation } from "react-i18next";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Share2, 
  Volume2, 
  Save, 
  MessageSquareText, 
  Check, 
  UserCheck, 
  Clock, 
  Sparkles, 
  X, 
  Send,
  ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const ActionPanel = ({ 
  result,
  onDownloadPDF, 
  onShare, 
  onListen, 
  onSaveHistory, 
  onAskAI,
  onUpdateReport
}) => {
  const { t } = useTranslation();
  
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [expertNotes, setExpertNotes] = useState('');
  const [preferredContact, setPreferredContact] = useState('in_app');
  const [submittingExpert, setSubmittingExpert] = useState(false);

  const reportId = result?.id || result?._id;
  const isExpertRequested = result?.expert_review?.status === 'pending' || result?.diagnostic_status === 'Expert Review Pending';
  const isExpertConfirmed = result?.diagnostic_status === 'Confirmed by Expert' || result?.expert_review?.status === 'reviewed';

  const handleShareClick = () => {
    onShare();
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleListenClick = () => {
    setIsSpeaking(true);
    onListen(() => setIsSpeaking(false));
  };

  const handleRequestExpertSubmit = async (e) => {
    e.preventDefault();
    if (!reportId) {
      toast.error("Please ensure the scan report is saved before requesting expert review.");
      return;
    }
    setSubmittingExpert(true);
    try {
      const res = await api.post(`/reports/${reportId}/request-expert`, {
        notes: expertNotes.trim() || undefined,
        preferred_contact: preferredContact
      });
      toast.success("Expert review requested! An agronomist will review your scan.");
      setShowExpertModal(false);
      setExpertNotes('');
      if (onUpdateReport && res.data?.report) {
        onUpdateReport(res.data.report);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit expert review request.");
    } finally {
      setSubmittingExpert(false);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-6 relative"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-indigo-500 rounded-full inline-block"></span>
            {t("report_actions")}
          </h3>

          {/* Expert Status Indicator if applicable */}
          {isExpertConfirmed ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck size={14} />
              Confirmed by Expert Agronomist
            </span>
          ) : isExpertRequested ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <Clock size={14} />
              Agronomist Review Pending
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <button 
            onClick={onDownloadPDF}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition group border border-indigo-100 shadow-sm"
            title="Download full PDF diagnostic dossier"
          >
            <Download size={22} className="mb-2 group-hover:-translate-y-1 transition" />
            <span className="text-xs font-bold">{t("download")}</span>
          </button>

          <button 
            onClick={handleShareClick}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white transition group border border-emerald-100 shadow-sm"
          >
            {copied ? <Check size={22} className="mb-2" /> : <Share2 size={22} className="mb-2 group-hover:rotate-12 transition" />}
            <span className="text-xs font-bold">{copied ? 'Copied!' : 'Share'}</span>
          </button>

          <button 
            onClick={handleListenClick}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl transition group border shadow-sm ${isSpeaking ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white border-amber-100'}`}
          >
            <Volume2 size={22} className={`mb-2 ${isSpeaking ? 'animate-pulse' : 'group-hover:scale-110 transition'}`} />
            <span className="text-xs font-bold">{t("listen")}</span>
          </button>

          <button 
            onClick={onAskAI}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition group border border-blue-100 shadow-sm"
          >
            <MessageSquareText size={22} className="mb-2 group-hover:-translate-y-1 transition" />
            <span className="text-xs font-bold">{t("ask_ai")}</span>
          </button>

          <button 
            onClick={() => setShowExpertModal(true)}
            disabled={isExpertRequested || isExpertConfirmed}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl transition group border shadow-sm ${
              isExpertRequested || isExpertConfirmed 
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                : 'bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white border-teal-100'
            }`}
          >
            <UserCheck size={22} className="mb-2 group-hover:scale-110 transition" />
            <span className="text-xs font-bold">
              {isExpertConfirmed ? 'Verified' : isExpertRequested ? 'Requested' : 'Ask Expert'}
            </span>
          </button>
          
          <button 
            onClick={onSaveHistory}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 text-gray-700 hover:bg-gray-800 hover:text-white transition group border border-gray-200 shadow-sm"
          >
            <Save size={22} className="mb-2 group-hover:scale-110 transition" />
            <span className="text-xs font-bold">{t("save")}</span>
          </button>
        </div>
      </motion.div>

      {/* Expert Consultation Request Modal */}
      <AnimatePresence>
        {showExpertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 text-lg">Request Agronomist Review</h4>
                    <p className="text-xs text-gray-500">Connect with a certified plant pathologist</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExpertModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRequestExpertSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Scan Reference
                  </label>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 font-medium">
                    <span className="font-bold text-gray-900">{result?.crop_name || 'Crop'}</span> — {result?.disease_name?.replace(/___/g, ' ') || 'Disease'} 
                    <span className="text-gray-400 ml-2">({result?.scan_id || 'ID Pending'})</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Specific Observations or Questions for Agronomist
                  </label>
                  <textarea
                    rows={4}
                    value={expertNotes}
                    onChange={(e) => setExpertNotes(e.target.value)}
                    placeholder="e.g. Symptoms started 3 days after rain. Lower leaves turning yellow with brown spots. Need second opinion on chemical dosage..."
                    className="w-full text-xs sm:text-sm p-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Preferred Communication
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                    <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${preferredContact === 'in_app' ? 'border-teal-500 bg-teal-50/50 text-teal-800 font-bold' : 'border-gray-200 bg-white text-gray-600'}`}>
                      <input 
                        type="radio" 
                        name="contact_pref" 
                        value="in_app" 
                        checked={preferredContact === 'in_app'} 
                        onChange={() => setPreferredContact('in_app')} 
                        className="text-teal-600"
                      />
                      <span>In-App Report</span>
                    </label>
                    <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${preferredContact === 'whatsapp_call' ? 'border-teal-500 bg-teal-50/50 text-teal-800 font-bold' : 'border-gray-200 bg-white text-gray-600'}`}>
                      <input 
                        type="radio" 
                        name="contact_pref" 
                        value="whatsapp_call" 
                        checked={preferredContact === 'whatsapp_call'} 
                        onChange={() => setPreferredContact('whatsapp_call')} 
                        className="text-teal-600"
                      />
                      <span>WhatsApp / Phone</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowExpertModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingExpert}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-200 flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {submittingExpert ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Submit for Expert Review</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ActionPanel;
