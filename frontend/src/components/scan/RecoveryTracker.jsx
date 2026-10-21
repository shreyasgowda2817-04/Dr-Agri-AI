import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitCommit, 
  PlusCircle, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Pencil, 
  Clock, 
  Sparkles, 
  X,
  FileCheck2,
  TrendingUp,
  Tag
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const RecoveryTracker = ({ result, onUpdateReport, readOnly = false }) => {
  const { t } = useTranslation();
  const [showLogModal, setShowLogModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [eventType, setEventType] = useState('treatment_applied');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState('improving');
  const [treatmentName, setTreatmentName] = useState('');
  const [cost, setCost] = useState('');

  const reportId = result?.id || result?._id;
  const timeline = result?.recovery_timeline || [];

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!reportId) {
      toast.error("Please save the report before logging recovery actions.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please provide an action title.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        event_type: eventType,
        title: title.trim(),
        notes: notes.trim() || undefined,
        recovery_status: recoveryStatus || undefined,
        treatment_name: treatmentName.trim() || undefined,
        cost: cost ? parseFloat(cost) : undefined
      };

      const res = await api.post(`/reports/${reportId}/timeline`, payload);
      toast.success("Action logged to recovery timeline!");
      setShowLogModal(false);
      setTitle('');
      setNotes('');
      setTreatmentName('');
      setCost('');

      if (onUpdateReport && res.data?.report) {
        onUpdateReport(res.data.report);
      }
    } catch (err) {
      console.error("Timeline log error:", err);
      toast.error(err.response?.data?.detail || "Failed to log action.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (st) => {
    switch (st?.toLowerCase()) {
      case 'improving':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'resolved':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'worsening':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'stable':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mt-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
            <TrendingUp size={14} />
            <span>Field Management & Verification</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Recovery History & Farmer Action Logs
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Track foliar applications, visual changes, and recovery progress over time.
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition hover:shadow-indigo-100"
          >
            <PlusCircle size={15} />
            <span>Log Treatment or Note</span>
          </button>
        )}
      </div>

      {/* ── TIMELINE MILESTONES ── */}
      <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-100">
        {timeline && timeline.length > 0 ? (
          timeline.map((event, idx) => (
            <div key={event.timeline_id || idx} className="relative group">
              {/* Dot */}
              <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shadow-xs">
                <div className="w-2 h-2 rounded-full bg-indigo-600" />
              </div>

              {/* Event Card */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 transition group-hover:border-indigo-200 group-hover:bg-indigo-50/20">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      {event.title}
                    </span>
                    {event.recovery_status && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${getStatusColor(event.recovery_status)}`}>
                        {event.recovery_status}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {new Date(event.timestamp || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {event.description && (
                  <p className="text-xs text-gray-600 leading-relaxed mb-2">
                    {event.description}
                  </p>
                )}

                {event.notes && (
                  <p className="text-xs text-gray-600 italic bg-white/70 p-2.5 rounded-xl border border-gray-100 mb-2">
                    "{event.notes}"
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 font-medium">
                  {event.treatment_name && (
                    <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-gray-100">
                      <Tag size={11} className="text-indigo-500" />
                      <span>{event.treatment_name}</span>
                    </span>
                  )}
                  {event.cost !== undefined && event.cost !== null && (
                    <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-gray-100 font-bold text-emerald-700">
                      <span>Expense: ₹{event.cost}</span>
                    </span>
                  )}
                  {event.recorded_by && (
                    <span className="text-gray-400">
                      By {event.recorded_by}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-gray-400 italic py-4">
            No recovery milestones recorded yet. Click "Log Treatment or Note" above to record your first field action.
          </div>
        )}
      </div>

      {/* ── MODAL TO LOG ACTION ── */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                <div className="flex items-center gap-2">
                  <Pencil size={18} className="text-indigo-600" />
                  <h4 className="text-lg font-black text-gray-900">Record Field Action / Note</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleLogSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Action Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="treatment_applied">Treatment / Spray Applied</option>
                    <option value="foliar_spray">Foliar Nutrition Spray</option>
                    <option value="field_inspection">Field Visual Inspection</option>
                    <option value="pruning_sanitation">Pruning / Sanitation Done</option>
                    <option value="followup_scan">Follow-Up Image Scan</option>
                    <option value="note">Farmer Note / Observation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Applied Copper Oxychloride Spray"
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Product / Treatment</label>
                    <input
                      type="text"
                      value={treatmentName}
                      onChange={(e) => setTreatmentName(e.target.value)}
                      placeholder="e.g. Blitox 50 WP (2.5g/L)"
                      className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Observed Status</label>
                    <select
                      value={recoveryStatus}
                      onChange={(e) => setRecoveryStatus(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="improving">Improving (Lesions drying)</option>
                      <option value="stable">Stable (No active spread)</option>
                      <option value="worsening">Needs Attention / Spreading</option>
                      <option value="resolved">Resolved (Healthy regrowth)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Expense Incurred (₹ optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Field Observation Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Details about weather during spray, affected plant rows, or visual response..."
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm"
                  >
                    {loading ? 'Saving...' : 'Save Milestone'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RecoveryTracker;
