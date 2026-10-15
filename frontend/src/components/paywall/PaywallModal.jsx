import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Check, ShieldCheck, Loader } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { fetchUser } from '../../store/slices/authSlice';
import { useDispatch, useSelector } from 'react-redux';

const PRO_FEATURES = [
  'Unlimited AI Disease Scans',
  'Priority AI Chatbot (Gemini 2.5)',
  'Full IoT Real-Time Analytics',
  'Marketplace & E-Commerce Access',
  'PDF Reports & Order History',
  'Email Notifications & Alerts',
];

const FREE_FEATURES = [
  '5 AI Scans per month',
  'Basic Chatbot',
  'IoT Dashboard (Read-only)',
  'Marketplace Browse',
];

const PaywallModal = ({ onClose }) => {
  const { t } = useTranslation();
  

  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const { user } = useSelector(state => state.auth);

  const handleUpgrade = async () => {
    

    setLoading(true);
    try {
      const response = await api.post('/payments/upgrade-to-pro');

      // Razorpay Flow
      const options = {
        key: response.data.razorpay_key_id,
        amount: response.data.amount * 100, // paisa
        currency: response.data.currency,
        name: "Dr Agri AI",
        description: "Pro Tier Upgrade",
        order_id: response.data.razorpay_order_id,
        handler: async function (payment_response) {
          try {
            await api.post('/payments/verify-upgrade', {
              razorpay_payment_id: payment_response.razorpay_payment_id,
              razorpay_order_id: payment_response.razorpay_order_id,
              razorpay_signature: payment_response.razorpay_signature,
              order_ref: "UPG-" + user?.id
            });
            
            toast.success('🎉 Welcome to Dr Agri Pro!');
            dispatch(fetchUser());
            onClose();
          } catch (err) {
            console.error(err);
            toast.error("Upgrade verification failed.");
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: "9999999999"
        },
        theme: {
          color: "#10B981"
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        toast.error(resp.error.description);
        setLoading(false);
      });
      rzp.open();

    } catch (err) {
      toast.error('Upgrade failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-800"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-500 to-green-700 dark:from-emerald-900/80 dark:to-green-950 p-8 text-white text-center relative border-b border-emerald-400 dark:border-emerald-800">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition"
            >
              <X size={20} />
            </button>
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 dark:bg-black/20 rounded-2xl mb-4 shadow-inner">
              <Zap className="text-yellow-300 dark:text-yellow-400" size={32} />
            </div>
            <h2 className="text-2xl font-black mb-1">{t("upgrade_to_pro")}</h2>
            <p className="text-green-100 dark:text-green-200 text-sm font-medium">{t("you_ve_reached_your_")}</p>
          </div>

          {/* Plan Comparison */}
          <div className="p-8">
            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Free */}
              <div className="bg-gray-50 dark:bg-gray-950 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
                <p className="font-bold text-gray-500 dark:text-gray-400 text-sm mb-3 uppercase tracking-wide">{t("free")}</p>
                <ul className="space-y-2">
                  {FREE_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Check size={14} className="text-gray-400 dark:text-gray-600 mt-0.5 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border-2 border-green-400 dark:border-green-600 relative shadow-sm">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 dark:bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">{t("recommended")}</span>
                <p className="font-bold text-green-700 dark:text-green-400 text-sm mb-3 uppercase tracking-wide">{t("pro")}</p>
                <ul className="space-y-2">
                  {PRO_FEATURES.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200 font-medium">
                      <Check size={14} className="text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <p className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                $29<span className="text-base font-medium text-gray-500 dark:text-gray-400">{t("_month")}</span>
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 font-medium">{t("cancel_anytime___bil")}</p>

              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-emerald-600 hover:to-green-700 transition shadow-lg shadow-green-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <Loader size={20} className="animate-spin" />
                ) : (
                  <><ShieldCheck size={20} />{t("upgrade_now___instan")}</>
                )}
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 flex items-center justify-center gap-1 font-medium">
                <ShieldCheck size={12} />{t("secured_by_razorpay_")}</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaywallModal;
