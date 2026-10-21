import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { motion } from 'framer-motion';
import { 
  HeartPulse, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight,
  Flame,
  Sprout
} from 'lucide-react';

const RecoveryPlan = ({ result, ui }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('immediate');

  const recoveryPlan = result?.recovery_plan || {
    immediate_actions: [
      "Prune and safely discard severely spotted foliage to reduce pathogen inoculum",
      "Disinfect pruning shears with 70% alcohol between plant rows",
      "Suspend overhead sprinkler watering; keep foliage dry to arrest spore germination"
    ],
    next_3_days: [
      "Apply protective foliar spray early in the morning during the optimal spray window",
      "Inspect border rows and perimeter canopy for early symptom spread"
    ],
    next_7_days: [
      "Apply water-soluble foliar nutrition (NPK 19:19:19 @ 4-5 g/L) to encourage canopy regeneration",
      "Ensure proper plant spacing and airflow through lower canopy thinning"
    ],
    follow_up_monitoring: [
      "Perform a follow-up image scan in 7-10 days to verify lesion drying and lack of sporulation",
      "Confirm new shoot emergence is green, vigorous, and free from chlorosis"
    ]
  };

  const tabs = [
    {
      id: 'immediate',
      label: 'Immediate (0-48h)',
      icon: <Flame size={15} className="text-rose-500" />,
      badge: 'Urgent',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      items: recoveryPlan.immediate_actions || []
    },
    {
      id: 'next3',
      label: 'Next 3 Days',
      icon: <Clock size={15} className="text-amber-500" />,
      badge: 'Action Window',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      items: recoveryPlan.next_3_days || []
    },
    {
      id: 'next7',
      label: 'Next 7 Days',
      icon: <Calendar size={15} className="text-blue-500" />,
      badge: 'Canopy Nutrition',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      items: recoveryPlan.next_7_days || []
    },
    {
      id: 'monitoring',
      label: 'Follow-Up (Day 10-14)',
      icon: <Sprout size={15} className="text-emerald-500" />,
      badge: 'Recovery Rescan',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      items: recoveryPlan.follow_up_monitoring || []
    }
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mt-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            <HeartPulse size={14} />
            <span>Personalized Recovery Protocol</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            4-Stage Crop Health Recovery Plan
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Step-by-step agronomic roadmap to control pathogen progression and restore yield potential.
          </p>
        </div>
      </div>

      {/* ── STAGE TABS ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-gray-100 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 border ${
                isActive 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="bg-gray-50/70 rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-black uppercase tracking-wider text-gray-500">
            Phase Recommendations
          </span>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentTab.badgeColor}`}>
            {currentTab.badge}
          </span>
        </div>

        <div className="space-y-3">
          {currentTab.items && currentTab.items.length > 0 ? (
            currentTab.items.map((action, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-xs"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  {idx + 1}
                </div>
                <div className="flex-1 text-xs sm:text-sm text-gray-700 leading-relaxed font-medium">
                  {action}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 italic">No specific actions recorded for this phase.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default RecoveryPlan;
