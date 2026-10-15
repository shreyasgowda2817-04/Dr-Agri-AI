import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, Crown, Calendar, AlertTriangle, ArrowUpRight, 
  CreditCard, RefreshCw, XCircle, FileText, CheckCircle2, Loader2, Sparkles
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { fetchUser } from '../store/slices/authSlice';

const ManageSubscription = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [sub, setSub] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const [subRes, histRes] = await Promise.all([
        api.get('/subscriptions/me'),
        api.get('/subscriptions/history').catch(() => ({ data: [] }))
      ]);
      setSub(subRes.data);
      setHistory(histRes.data || []);
    } catch (err) {
      toast.error('Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      const res = await api.post('/subscriptions/cancel');
      setSub(res.data);
      toast.info('Auto-renewal cancelled. Your premium benefits remain active until the end of your billing cycle.');
      setShowCancelModal(false);
      dispatch(fetchUser());
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  const isPremium = Boolean(sub?.is_premium);
  const isCancelled = sub?.status === 'cancelled';

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            Subscription & Billing
            {isPremium && (
              <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <Crown size={20} />
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your Dr Agri AI subscription tier, billing period, and payment receipts.
          </p>
        </div>

        <Link
          to="/subscription/plans"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
        >
          <span>{isPremium ? 'Change Tier / Renew' : 'Upgrade to Premium'}</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* Main Status Hero Card */}
      <div className={`rounded-3xl p-6 sm:p-8 mb-8 border transition-all ${
        isPremium
          ? 'bg-gradient-to-br from-emerald-900/10 via-teal-900/5 to-white dark:from-emerald-950/40 dark:via-gray-800 dark:to-gray-800 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-700/60">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                isPremium
                  ? isCancelled
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {isPremium ? (isCancelled ? 'Cancelled (Active Grace Period)' : 'Active Premium') : 'Free Plan'}
              </span>

              {isPremium && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  <ShieldCheck size={13} /> 100% Ad-Free
                </span>
              )}
            </div>

            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              {sub?.plan_name || 'Free Community Tier'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isPremium 
                ? 'Your account enjoys full ad suppression, priority agronomist routing, and unlimited scans.'
                : 'Standard access with sponsored community ads. Upgrade for an uninterrupted, ad-free experience.'}
            </p>
          </div>

          {/* Days Remaining or Upgrade CTA */}
          <div className="text-left md:text-right">
            {isPremium ? (
              <div>
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {sub?.days_remaining ?? 0}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Days Remaining</span>
              </div>
            ) : (
              <Link
                to="/subscription/plans"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md hover:from-emerald-700 hover:to-teal-700 transition"
              >
                <Sparkles size={14} /> Remove Ads for ₹99/mo
              </Link>
            )}
          </div>
        </div>

        {/* Plan Metadata & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
          <div>
            <span className="text-xs text-gray-400 font-medium block mb-1">Billing Period</span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {isPremium ? (sub?.plan_id === 'yearly' ? 'Yearly Billing (₹799/yr)' : 'Monthly Billing (₹99/mo)') : 'Free (₹0/mo)'}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-400 font-medium block mb-1">Expiry / Renewal Date</span>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {sub?.end_date ? new Date(sub.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Never'}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-400 font-medium block mb-1">Status</span>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              {isPremium ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={16} /> Verified Active
                </span>
              ) : (
                <span className="text-gray-500">Ad-Supported Free</span>
              )}
            </div>
          </div>
        </div>

        {/* Cancellation Action if Active */}
        {isPremium && !isCancelled && (
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/60 flex justify-end">
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline transition"
            >
              Cancel Auto-Renewal
            </button>
          </div>
        )}
      </div>

      {/* Feature Checklist */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 mb-8 border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Included Plan Privileges</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700 dark:text-gray-300">
          {(sub?.features || []).map((feat, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice & Payment History */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={18} className="text-emerald-600" />
            Billing & Receipt History
          </h3>
          <span className="text-xs text-gray-400">{history.length} records</span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">
            No previous subscription invoices on record.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Plan</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {history.map((item) => (
                  <tr key={item.id || item._id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                    <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800 dark:text-gray-200">
                      {item.plan_name}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                      ₹{item.amount}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                      {item.razorpay_order_id || item.id}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Cancel Auto-Renewal?</h3>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Your subscription will remain active and completely ad-free until <strong>{sub?.end_date ? new Date(sub.end_date).toLocaleDateString() : 'the end of your billing cycle'}</strong>. After that date, your account will smoothly revert to the standard ad-supported free tier.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCancelModal(false)}
                className="py-2 px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Keep Subscription
              </button>
              <button
                disabled={cancelling}
                onClick={handleCancelSubscription}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2"
              >
                {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSubscription;
