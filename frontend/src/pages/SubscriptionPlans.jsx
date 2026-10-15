import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Check, Sparkles, Zap, ArrowRight, 
  Crown, CreditCard, Ban, FileText, HeartHandshake, Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { fetchUser } from '../store/slices/authSlice';

const SubscriptionPlans = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState(null);
  const [testModalOrder, setTestModalOrder] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [plansRes, subRes] = await Promise.all([
          api.get('/subscriptions/plans'),
          api.get('/subscriptions/me').catch(() => ({ data: null }))
        ]);
        setPlans(plansRes.data || []);
        if (subRes?.data) setCurrentSub(subRes.data);
      } catch (err) {
        toast.error('Unable to load subscription plans');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle Checkout initiation
  const handleSelectPlan = async (plan) => {
    if (plan.id === 'free') {
      toast.info('You are already enjoying the free community plan!');
      return;
    }

    try {
      setProcessingPlanId(plan.id);

      // 1. Create order on backend
      const orderRes = await api.post('/subscriptions/create-order', { plan_id: plan.id });
      const orderData = orderRes.data;

      // 2. If Razorpay SDK is available and key is configured
      if (window.Razorpay && !orderData.is_mock && orderData.key_id && orderData.key_id !== 'rzp_test_placeholder') {
        const options = {
          key: orderData.key_id,
          amount: Math.round(orderData.amount * 100),
          currency: orderData.currency || 'INR',
          name: 'Dr Agri AI',
          description: `${orderData.plan_name} Subscription`,
          order_id: orderData.order_id,
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || ''
          },
          theme: {
            color: '#059669' // emerald-600
          },
          handler: async (response) => {
            try {
              // 3. Cryptographically verify signature on server
              const verifyRes = await api.post('/subscriptions/verify', {
                plan_id: plan.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              toast.success(`🎉 Welcome to ${plan.name}! Your account is now 100% Ad-Free.`);
              dispatch(fetchUser());
              navigate('/subscription/manage');
            } catch (vErr) {
              toast.error(vErr.response?.data?.detail || 'Payment verification failed');
            }
          },
          modal: {
            ondismiss: () => {
              setProcessingPlanId(null);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) => {
          toast.error(`Payment failed: ${resp.error.description}`);
          setProcessingPlanId(null);
        });
        rzp.open();
      } else {
        // Fallback for Development/Testing Mode
        setTestModalOrder(orderData);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to initiate checkout session');
      setProcessingPlanId(null);
    }
  };

  // Complete simulated development payment
  const handleCompleteTestPayment = async () => {
    if (!testModalOrder) return;
    try {
      const mockPaymentId = `pay_mock_${Date.now()}`;
      const mockSignature = `sig_mock_${Date.now()}`;

      await api.post('/subscriptions/verify', {
        plan_id: testModalOrder.plan_id,
        razorpay_order_id: testModalOrder.order_id,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: mockSignature
      });

      toast.success(`🎉 Test Payment Verified! Upgraded to ${testModalOrder.plan_name}.`);
      setTestModalOrder(null);
      setProcessingPlanId(null);
      dispatch(fetchUser());
      navigate('/subscription/manage');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to complete test verification');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-200 dark:border-emerald-800">
          <Sparkles size={14} /> Dr Agri AI Premium
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
          Choose the Perfect Farming Companion
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          Upgrade to Dr Agri AI Premium for a completely ad-free experience, unlimited crop diagnostics, and priority agronomist video consultations.
        </p>

        {currentSub?.is_premium && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-sm font-semibold">
            <Crown className="w-5 h-5 text-amber-500" />
            <span>Active Subscription: <strong>{currentSub.plan_name}</strong> ({currentSub.days_remaining} days remaining)</span>
            <Link to="/subscription/manage" className="underline ml-2 text-emerald-700 dark:text-emerald-400">
              Manage
            </Link>
          </div>
        )}
      </div>

      {/* Pricing Cards Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const isCurrentPlan = currentSub?.plan_id === plan.id && (plan.id === 'free' ? !currentSub?.is_premium : currentSub?.is_premium);
            const isYearly = plan.id === 'yearly';

            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className={`relative rounded-3xl flex flex-col justify-between p-8 transition-all ${
                  isYearly
                    ? 'bg-gradient-to-b from-white to-emerald-50/50 dark:from-gray-800 dark:to-emerald-950/20 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
                }`}
              >
                {/* Popular / Best Value Badge */}
                {plan.is_popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                      {plan.badge || 'Best Value'}
                    </span>
                  </div>
                )}

                <div>
                  {/* Title & Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {plan.name}
                    </h3>
                    {plan.id !== 'free' && (
                      <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                        <Crown size={18} />
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 min-h-[32px]">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                        ₹{plan.price}
                      </span>
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        /{plan.billing_period}
                      </span>
                    </div>
                    {isYearly && (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                        Equivalent to just ~₹66/month
                      </p>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-8">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Included Features</p>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 dark:text-gray-200">
                        <div className="p-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0">
                          <Check size={12} />
                        </div>
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action CTA Button */}
                <div>
                  <button
                    disabled={isCurrentPlan || processingPlanId === plan.id}
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm ${
                      isCurrentPlan
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
                        : isYearly
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-98'
                        : plan.id === 'free'
                        ? 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                        : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 active:scale-98'
                    }`}
                  >
                    {processingPlanId === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : plan.id === 'free' ? (
                      'Free Forever'
                    ) : (
                      <>
                        <span>Upgrade to {plan.name}</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Trust & Guarantee Banner */}
      <div className="mt-16 bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white">100% Secure Razorpay Checkout</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Encrypted 256-bit payment gateway with instant activation & cancel-anytime policy.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1"><CreditCard size={15} /> UPI / Cards / NetBanking</span>
          <span className="flex items-center gap-1"><Ban size={15} /> Zero Hidden Fees</span>
        </div>
      </div>

      {/* Simulated Dev Payment Modal */}
      {testModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Test Mode Checkout</h3>
                <p className="text-xs text-gray-500">Dr Agri AI Razorpay Sandbox</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-2 mb-6 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Plan:</span>
                <strong>{testModalOrder.plan_name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <strong>₹{testModalOrder.amount} INR</strong>
              </div>
              <div className="flex justify-between">
                <span>Order Ref:</span>
                <span className="font-mono">{testModalOrder.order_id}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-6">
              Razorpay API keys are in local development mode. Click verify below to simulate cryptographic payment signature verification on the server.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setTestModalOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteTestPayment}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
              >
                Authorize & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlans;
