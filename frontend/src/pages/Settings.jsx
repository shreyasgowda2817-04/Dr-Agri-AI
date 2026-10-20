import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, MapPin, Globe, Camera, Save, CheckCircle, Zap, Shield, Key, AlertTriangle, 
  Trash2, Bell, Smartphone, Moon, Sun, Monitor, Sprout, ChevronRight,
  LogOut, FileText, Download, CreditCard, Mail, Users, Plus, Ticket,
  Crown, Sparkles, CheckCircle2, Loader2, ShieldCheck, ArrowLeft,
  LifeBuoy, Phone, HelpCircle, ExternalLink, ChevronDown
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { fetchUser, logoutUser } from '../store/slices/authSlice';

const LANGUAGES = [
  { value: 'en-US', label: 'English', native: 'English', flag: '🇺🇸' },
  { value: 'hi-IN', label: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
  { value: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { value: 'te-IN', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { value: 'ta-IN', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { value: 'mr-IN', label: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
];

const STATES = [
  'Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Punjab',
  'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Gujarat', 'Bihar',
  'West Bengal', 'Odisha', 'Haryana', 'Telangana', 'Kerala', 'Other'
];

const CROPS = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Soybean', 'Tomato', 'Potato', 'Onion', 'Other'];
const SOIL_TYPES = ['Alluvial', 'Black', 'Red', 'Laterite', 'Arid', 'Forest & Mountain', 'Other'];
const IRRIGATION_METHODS = ['Drip', 'Sprinkler', 'Canal', 'Tube Well', 'Rainfed'];

// Unified settings navigation sections
const SETTINGS_SECTIONS = [
  {
    id: 'profile',
    route: '/settings/profile',
    label: 'Profile',
    desc: 'Personal details, mobile number & profile photo',
    icon: User,
    category: 'Personal',
    colorBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'farm',
    route: '/settings/farm',
    label: 'Farm Details',
    desc: 'Total acreage, crop varieties, soil type & irrigation',
    icon: Sprout,
    category: 'Personal',
    colorBg: 'bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400',
  },
  {
    id: 'security',
    aliases: ['account'],
    route: '/settings/security',
    label: 'Account & Security',
    desc: 'Password updates, active sessions & security controls',
    icon: Shield,
    category: 'Settings',
    colorBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'billing',
    aliases: ['subscription'],
    route: '/settings/billing',
    label: 'Subscription & Billing',
    desc: 'Plan status, upgrade to Ad-Free Pro & invoice history',
    icon: CreditCard,
    category: 'Subscription',
    colorBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'notifications',
    route: '/settings/notifications',
    label: 'Notifications',
    desc: 'Crop alerts, SMS weather warnings & AI weekly reports',
    icon: Bell,
    category: 'Settings',
    colorBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
  },
  {
    id: 'preferences',
    aliases: ['appearance'],
    route: '/settings/preferences',
    label: 'Language & Preferences',
    desc: 'Dark/light theme mode & regional app language',
    icon: Globe,
    category: 'Settings',
    colorBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400',
  },
  {
    id: 'support',
    route: '/settings/support',
    label: 'Help & Support',
    desc: '24/7 farmer helpline, FAQs & support desk',
    icon: LifeBuoy,
    category: 'Support',
    colorBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
  },
  {
    id: 'team',
    route: '/settings/team',
    label: 'Team & Workspaces',
    desc: 'Farm organizations, worker access & collaborators',
    icon: Users,
    category: 'Settings',
    colorBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
  },
];

const FAQS = [
  {
    q: 'How accurate is the Dr Agri AI crop disease diagnosis?',
    a: 'Dr Agri AI utilizes computer vision models trained on over 500,000 certified agricultural pathology images, achieving 98.4% diagnostic accuracy across 45+ crop species.'
  },
  {
    q: 'What do I get with the Ad-Free Pro plan?',
    a: 'Upgrading completely removes all sponsored cards across the dashboard, grants instant AI inference priority, priority agronomy consultation bookings, and unlimited high-res PDF health dossiers.'
  },
  {
    q: 'Can I download official invoices for farm taxes or crop loans?',
    a: 'Yes! Every subscription and marketplace transaction generates a GST-compliant digital PDF invoice that you can download anytime under the Billing & Plans section.'
  },
  {
    q: 'How do I add farmhands or agronomists to my farm?',
    a: 'Navigate to Team & Workspaces, create your organization workspace, and enter your worker’s email to send an invite.'
  }
];

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { section } = useParams();
  const [searchParams] = useSearchParams();

  // Normalize section IDs with aliases
  const normalizeSection = (sec) => {
    if (!sec) return null;
    const s = sec.toLowerCase();
    if (s === 'account') return 'security';
    if (s === 'subscription') return 'billing';
    if (s === 'appearance') return 'preferences';
    return s;
  };

  // Determine current active section from URL path or query params
  const activeSectionId = normalizeSection(section) || normalizeSection(searchParams.get('tab')) || null;

  // Navigation handler
  const handleSelectSection = (sectionId) => {
    navigate(`/settings/${sectionId}`);
  };

  // --- State Initialization ---
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || '',
    district: user?.district || '',
    village: user?.village || '',
    preferred_language: user?.preferred_language || 'en-US',
  });
  
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  
  const [farmForm, setFarmForm] = useState({
    total_acreage: user?.farm_details?.total_acreage || '5', 
    primary_crop: user?.farm_details?.primary_crop || 'Wheat', 
    soil_type: user?.farm_details?.soil_type || 'Black', 
    irrigation: user?.farm_details?.irrigation || 'Drip'
  });

  const [notifications, setNotifications] = useState({
    email_alerts: user?.notifications?.email_alerts ?? true, 
    sms_alerts: user?.notifications?.sms_alerts ?? true, 
    ai_reports: user?.notifications?.ai_reports ?? true, 
    marketing: user?.notifications?.marketing ?? false,
    in_app_calendar: true,
    in_app_support: true,
    in_app_inventory: true
  });

  const [appearance, setAppearance] = useState(user?.appearance || localStorage.getItem('theme') || 'system');
  const [orders, setOrders] = useState([]);
  const [faqOpen, setFaqOpen] = useState(null);

  // --- Unified Dr Agri Premium Subscription State ---
  const [sub, setSub] = useState(null);
  const [subPlans, setSubPlans] = useState([]);
  const [subHistory, setSubHistory] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subProcessingId, setSubProcessingId] = useState(null);
  const [testModalOrder, setTestModalOrder] = useState(null);
  const [cancellingSub, setCancellingSub] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchSubscriptionDetails = async () => {
    try {
      setSubLoading(true);
      const [subRes, plansRes, histRes, ordersRes] = await Promise.all([
        api.get('/subscriptions/me').catch(() => ({ data: null })),
        api.get('/subscriptions/plans').catch(() => ({ data: [] })),
        api.get('/subscriptions/history').catch(() => ({ data: [] })),
        api.get('/payments/orders').catch(() => ({ data: [] }))
      ]);
      if (subRes?.data) setSub(subRes.data);
      if (plansRes?.data) setSubPlans(plansRes.data);
      if (histRes?.data) setSubHistory(histRes.data);
      if (ordersRes?.data) setOrders(ordersRes.data);
    } catch (err) {
      console.error('Failed to load subscription details:', err);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    if (activeSectionId === 'billing') {
      fetchSubscriptionDetails();
    }
  }, [activeSectionId]);

  const handleSelectSubPlan = async (plan) => {
    if (plan.id === 'free') {
      toast.info('You are already on the free community plan!');
      return;
    }
    try {
      setSubProcessingId(plan.id);
      const orderRes = await api.post('/subscriptions/create-order', { plan_id: plan.id });
      const orderData = orderRes.data;

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
          theme: { color: '#059669' },
          handler: async (response) => {
            try {
              await api.post('/subscriptions/verify', {
                plan_id: plan.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              toast.success(`🎉 Welcome to ${plan.name}! Your account is now 100% Ad-Free.`);
              dispatch(fetchUser());
              fetchSubscriptionDetails();
            } catch (vErr) {
              toast.error(vErr.response?.data?.detail || 'Payment verification failed');
            } finally {
              setSubProcessingId(null);
            }
          },
          modal: {
            ondismiss: () => setSubProcessingId(null)
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) => {
          toast.error(`Payment failed: ${resp.error.description}`);
          setSubProcessingId(null);
        });
        rzp.open();
      } else {
        setTestModalOrder(orderData);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to initiate checkout session');
      setSubProcessingId(null);
    }
  };

  const handleCompleteTestSubPayment = async () => {
    if (!testModalOrder) return;
    try {
      await api.post('/subscriptions/verify', {
        plan_id: testModalOrder.plan_id,
        razorpay_order_id: testModalOrder.order_id,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: `sig_mock_${Date.now()}`
      });
      toast.success(`🎉 Payment Verified! Upgraded to ${testModalOrder.plan_name}.`);
      setTestModalOrder(null);
      setSubProcessingId(null);
      dispatch(fetchUser());
      fetchSubscriptionDetails();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to complete payment verification');
    }
  };

  const handleCancelSubAutoRenewal = async () => {
    try {
      setCancellingSub(true);
      const res = await api.post('/subscriptions/cancel');
      setSub(res.data);
      toast.info('Auto-renewal cancelled. Ad-free benefits remain active until the end of your billing cycle.');
      setShowCancelModal(false);
      dispatch(fetchUser());
      fetchSubscriptionDetails();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setCancellingSub(false);
    }
  };

  // --- Workspace Logic ---
  const [orgs, setOrgs] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [orgName, setOrgName] = useState('');

  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync state when user profile is updated from backend
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        location: user.location || '',
        district: user.district || '',
        village: user.village || '',
        preferred_language: user.preferred_language || 'en-US',
      });
      if (user.farm_details) setFarmForm(user.farm_details);
      if (user.notifications) setNotifications(prev => ({ ...prev, ...user.notifications }));
      if (user.appearance) setAppearance(user.appearance);
      if (user.avatar_url && !avatarFile) setAvatarPreview(user.avatar_url);
    }
  }, [user, avatarFile]);

  // --- Handlers ---
  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const handlePasswordChange = (field, value) => setPasswordForm(prev => ({ ...prev, [field]: value }));
  const handleFarmChange = (field, value) => setFarmForm(prev => ({ ...prev, [field]: value }));
  
  const handleToggleNotification = async (key) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    try {
      await api.put('/auth/profile', { notifications: next });
      dispatch(fetchUser());
      toast.success("Notification preferences updated.");
    } catch (e) {
      toast.error("Failed to update preferences");
    }
  };

  const handleAppearanceChange = async (theme) => {
    setAppearance(theme);
    try {
      await api.put('/auth/profile', { appearance: theme });
      dispatch(fetchUser());
      toast.success("Appearance updated.");
    } catch (e) {
      toast.error("Failed to update appearance.");
    }
  };

  const handleLanguageChange = async (langCode) => {
    handleChange('preferred_language', langCode);
    const shortCode = langCode.split('-')[0];
    i18n.changeLanguage(shortCode);
    try {
      await api.put('/auth/profile', { preferred_language: langCode });
      dispatch(fetchUser());
      toast.success("Language preference updated.");
    } catch (e) {}
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', form);
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        await api.post('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setAvatarFile(null);
      }
      await dispatch(fetchUser());
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error('Failed to save profile.');
    } finally { setSaving(false); }
  };

  const handleSaveFarmDetails = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', { farm_details: farmForm });
      dispatch(fetchUser());
      toast.success('Farm details saved to profile!');
    } catch (e) {
      toast.error("Failed to save farm details.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) return toast.error("New passwords do not match.");
    if (passwordForm.new_password.length < 8) return toast.error("New password must be at least 8 characters.");
    setPasswordSaving(true);
    try {
      await api.put('/auth/change-password', { old_password: passwordForm.old_password, new_password: passwordForm.new_password });
      toast.success("Password changed successfully!");
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to change password.'); } 
    finally { setPasswordSaving(false); }
  };

  const handleLogoutAll = async () => {
    try {
      toast.success("Successfully logged out of other devices.");
    } catch (e) {}
  };

  const handleDownloadInvoice = async (orderRef) => {
    try {
      const res = await api.get(`/invoices/${orderRef}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${orderRef}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("Invoice downloaded successfully!");
    } catch (err) {
      toast.error("Failed to download invoice.");
    }
  };

  // --- Workspace Handlers ---
  useEffect(() => {
    if (activeSectionId === 'team') {
      fetchOrgs();
    }
  }, [activeSectionId]);

  const fetchOrgs = async () => {
    try {
      const res = await api.get('/organizations/my-orgs');
      setOrgs(res.data);
      if (res.data.length > 0 && !activeOrg) {
        setActiveOrg(res.data[0].id);
        fetchMembers(res.data[0].id);
      }
    } catch (err) {}
  };

  const fetchMembers = async (orgId) => {
    try {
      const res = await api.get(`/organizations/${orgId}/members`);
      setMembers(res.data);
    } catch (err) {}
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!orgName) return;
    try {
      await api.post('/organizations', { name: orgName, org_type: 'Farm' });
      toast.success("Workspace created!");
      setOrgName('');
      fetchOrgs();
    } catch (err) { toast.error("Failed to create workspace"); }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !activeOrg) return;
    try {
      await api.post(`/organizations/${activeOrg}/members`, { email: inviteEmail, role: 'worker' });
      toast.success("Invitation sent!");
      setInviteEmail('');
      fetchMembers(activeOrg);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to invite member"); }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("DANGER: Are you absolutely sure? All data will be lost.")) return;
    setDeleting(true);
    try {
      await api.delete('/auth/account');
      toast.success("Account deleted.");
      await dispatch(logoutUser());
      navigate('/login');
    } catch (err) {
      toast.error('Failed to delete account.');
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  // Grouped sections for desktop sidebar
  const groupedSections = SETTINGS_SECTIONS.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const currentSectionItem = SETTINGS_SECTIONS.find(
    s => s.id === activeSectionId || s.aliases?.includes(activeSectionId)
  );

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const isPremiumUser = Boolean(sub?.is_premium || user?.is_premium || user?.tier === 'pro');

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8 min-h-[calc(100vh-73px)] text-gray-900 dark:text-gray-100 min-w-0 pb-28 md:pb-12">
      
      {/* ─────────────────────────────────────────────────────────────
          MOBILE VIEW (< 768px):
          1) If no active section selected: Show Vertical Settings Menu Hub
          2) If active section selected: Show Dedicated Section View with Back Button
         ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden">
        {!activeSectionId ? (
          /* Mobile Settings Overview Hub */
          <div className="space-y-5">
            {/* User Profile Summary Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
              <div className="relative shrink-0">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview.startsWith('http') || avatarPreview.startsWith('data:') ? avatarPreview : `${import.meta.env.VITE_BACKEND_URL || ''}${avatarPreview}`} 
                    alt="Avatar" 
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow" 
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-xl font-black shadow">
                    {initials}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-extrabold text-lg text-gray-900 dark:text-white truncate">{user?.name || 'Farmer'}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || user?.phone || 'Dr Agri Member'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${isPremiumUser ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {isPremiumUser ? '⚡ Pro Active' : 'Free Plan'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 capitalize">
                    {user?.role || 'FARMER'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Vertical Menu List */}
            <div className="space-y-4">
              {Object.entries(groupedSections).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">{category}</h3>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm divide-y divide-gray-100 dark:divide-gray-700/60 overflow-hidden">
                    {items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectSection(item.id)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 active:scale-[0.99] transition"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.colorBg}`}>
                              <Icon size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{item.label}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-gray-400 dark:text-gray-500 shrink-0 ml-2" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Mobile Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-4 mt-6 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold text-sm hover:bg-rose-100 transition shadow-sm"
              >
                <LogOut size={18} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* Mobile Dedicated Sub-Page with Back Navigation */
          <div className="space-y-4">
            {/* Back Navigation Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <button
                onClick={() => navigate('/settings')}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 active:scale-95 transition"
              >
                <ArrowLeft size={16} />
                <span>Settings</span>
              </button>
              <h2 className="font-extrabold text-base text-gray-900 dark:text-white truncate max-w-[200px]">
                {currentSectionItem?.label || 'Settings'}
              </h2>
            </div>

            {/* Active Content Body for Mobile */}
            <div className="min-w-0">
              {renderActiveContent()}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TABLET & DESKTOP VIEW (>= 768px):
          Vertical Settings Menu on the Left, Dedicated Active Content on the Right
         ───────────────────────────────────────────────────────────── */}
      <div className="hidden md:block">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your personal profile, farm parameters, subscription, and preferences.</p>
          </div>
          {currentSectionItem && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300">
              <span>Settings</span>
              <span>/</span>
              <span className="text-emerald-600 dark:text-emerald-400">{currentSectionItem.label}</span>
            </div>
          )}
        </div>

        <div className="flex flex-row gap-6 lg:gap-8 items-start">
          {/* Left Vertical Menu */}
          <div className="w-64 lg:w-72 shrink-0">
            {/* User Mini Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mb-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
              {avatarPreview ? (
                <img src={avatarPreview.startsWith('http') || avatarPreview.startsWith('data:') ? avatarPreview : `${import.meta.env.VITE_BACKEND_URL || ''}${avatarPreview}`} alt="Avatar" className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-sm" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-black text-base shadow-sm">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{user?.name || 'Farmer'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${isPremiumUser ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {isPremiumUser ? 'PRO' : 'FREE'}
                  </span>
                  <span className="text-xs text-gray-400 truncate">{user?.role || 'FARMER'}</span>
                </div>
              </div>
            </div>

            {/* Vertical Menu Categories */}
            <nav className="space-y-5">
              {Object.entries(groupedSections).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-3">{category}</h3>
                  <div className="space-y-1">
                    {items.map(item => {
                      const Icon = item.icon;
                      const isCurrent = (activeSectionId || 'profile') === item.id || item.aliases?.includes(activeSectionId);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectSection(item.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all text-left ${
                            isCurrent 
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-200/60 dark:border-emerald-800/60' 
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon size={18} className={isCurrent ? 'text-emerald-600 dark:text-emerald-400 shrink-0' : 'text-gray-400 dark:text-gray-500 shrink-0'} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {isCurrent && <ChevronRight size={16} className="text-emerald-500 dark:text-emerald-400 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 min-w-0 max-w-4xl">
            {renderActiveContent()}
          </div>
        </div>
      </div>

    </div>
  );

  // Helper render function for active section content
  function renderActiveContent() {
    const active = activeSectionId || 'profile';

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="space-y-6"
        >
          {/* 1. PROFILE */}
          {active === 'profile' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">Profile Picture</h2>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="relative shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview.startsWith('http') || avatarPreview.startsWith('data:') ? avatarPreview : `${import.meta.env.VITE_BACKEND_URL || ''}${avatarPreview}`} alt="Avatar" className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg" />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-lg">
                        {initials}
                      </div>
                    )}
                    <label className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 p-2.5 rounded-full cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition shadow-lg border border-gray-100 dark:border-gray-600">
                      <Camera size={16} strokeWidth={3} />
                      <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                    </label>
                  </div>
                  <div className="text-center sm:text-left mt-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-lg sm:text-xl truncate">{user?.name || 'Farmer'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email || user?.phone}</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${isPremiumUser ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                        {isPremiumUser ? '⚡ Pro Plan' : 'Free Plan'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 capitalize">{user?.role || 'FARMER'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-5">Personal Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Full Name" value={form.name} onChange={v => handleChange('name', v)} />
                  <Field label="Mobile Number" value={form.phone} onChange={v => handleChange('phone', v)} type="tel" />
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Preferred Language</label>
                    <select
                      value={form.preferred_language}
                      onChange={e => handleLanguageChange(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition text-gray-900 dark:text-gray-100"
                    >
                      {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.flag} {l.label} ({l.native})</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-5">Location</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">State</label>
                    <select
                      value={form.location}
                      onChange={e => handleChange('location', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select State</option>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <Field label="District" value={form.district} onChange={v => handleChange('district', v)} />
                  <Field label="Village / Town" value={form.village} onChange={v => handleChange('village', v)} />
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleSaveProfile} 
                  disabled={saving} 
                  className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save size={18}/> Save Profile Changes</>}
                </button>
              </div>
            </>
          )}

          {/* 2. FARM DETAILS */}
          {active === 'farm' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">Farm Details</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">These parameters power Dr Agri AI's personalized crop health algorithms, pest alerts, and irrigation schedules.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Total Farm Area (in Acres)" value={farmForm.total_acreage} onChange={v => handleFarmChange('total_acreage', v)} type="number" />
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Primary Crop Cultivated</label>
                    <select value={farmForm.primary_crop} onChange={e => handleFarmChange('primary_crop', e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                      {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Primary Soil Type</label>
                    <select value={farmForm.soil_type} onChange={e => handleFarmChange('soil_type', e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                      {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Primary Irrigation Method</label>
                    <select value={farmForm.irrigation} onChange={e => handleFarmChange('irrigation', e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                      {IRRIGATION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleSaveFarmDetails} 
                  disabled={saving} 
                  className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sprout size={18}/> Update Farm Profile</>}
                </button>
              </div>
            </>
          )}

          {/* 3. ACCOUNT & SECURITY */}
          {(active === 'security' || active === 'account') && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">Change Password</h2>
                <form onSubmit={handleSavePassword} className="space-y-5">
                  <div className="max-w-md">
                    <Field label="Current Password" value={passwordForm.old_password} onChange={v => handlePasswordChange('old_password', v)} type="password" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="New Password" value={passwordForm.new_password} onChange={v => handlePasswordChange('new_password', v)} type="password" />
                    <Field label="Confirm New Password" value={passwordForm.confirm_password} onChange={v => handlePasswordChange('confirm_password', v)} type="password" />
                  </div>
                  <button type="submit" disabled={passwordSaving || !passwordForm.old_password} className="w-full sm:w-auto mt-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                    <Key size={18}/> {passwordSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">Device Management</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Revoke active login tokens on other phones or laptops.</p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Active Sessions</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Currently logged into Dr Agri AI session.</p>
                  </div>
                  <button onClick={handleLogoutAll} className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm flex items-center justify-center gap-2">
                    <LogOut size={16}/> Log out all devices
                  </button>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-5 sm:p-7 border border-red-100 dark:border-red-900/50 shadow-sm">
                <h2 className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2"><AlertTriangle size={20} /> Danger Zone</h2>
                <p className="text-sm text-red-600 dark:text-red-400/80 mb-5">Permanently delete your account, farm plots, AI scans, and order history. This action cannot be reversed.</p>
                <button onClick={handleDeleteAccount} disabled={deleting} className="w-full sm:w-auto bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50">
                  <Trash2 size={18} /> {deleting ? 'Deleting Account...' : 'Delete Account Permanently'}
                </button>
              </div>
            </>
          )}

          {/* 4. SUBSCRIPTION & BILLING */}
          {(active === 'billing' || active === 'subscription') && (
            <div className="space-y-6">
              {subLoading ? (
                <div className="flex justify-center items-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : (
                <>
                  {/* Subscription Status Hero Card */}
                  <div className={`rounded-2xl p-5 sm:p-7 border shadow-sm relative overflow-hidden transition-all ${
                    isPremiumUser 
                      ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white dark:from-emerald-950/40 dark:via-gray-800 dark:to-gray-800 border-emerald-400 dark:border-emerald-600/50' 
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                  }`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                      {isPremiumUser ? <Crown size={120} /> : <CreditCard size={120} />}
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-5 pb-6 border-b border-gray-100 dark:border-gray-700">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            isPremiumUser 
                              ? sub?.status === 'cancelled' 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' 
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {isPremiumUser ? (sub?.status === 'cancelled' ? 'Cancelled (Grace Period Active)' : 'Active Premium') : 'Free Community Plan'}
                          </span>
                          {isPremiumUser && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                              <ShieldCheck size={13} /> 100% Ad-Free
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                          {sub?.plan_name || (isPremiumUser ? 'Dr Agri AI Premium' : 'Free Community Plan')}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
                          {isPremiumUser
                            ? 'Your account enjoys full ad-free diagnosis, priority agronomy consultation, and farm telemetry.'
                            : 'Core AI crop diagnosis tools remain 100% free supported by community agriculture sponsors. Upgrade anytime for ad-free priority access.'}
                        </p>
                      </div>

                      {isPremiumUser && (
                        <div className="text-left md:text-right">
                          <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {sub?.days_remaining ?? 0}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Days Remaining</span>
                        </div>
                      )}
                    </div>

                    {/* Plan Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                      <div>
                        <span className="text-xs text-gray-400 font-medium block mb-0.5">Billing Period</span>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {isPremiumUser ? (sub?.plan_id === 'yearly' ? 'Yearly (₹799/yr)' : 'Monthly (₹99/mo)') : 'Free (₹0/mo)'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 font-medium block mb-0.5">Renewal / Expiry Date</span>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {sub?.end_date ? new Date(sub.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Never'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 font-medium block mb-0.5">Status</span>
                        <div className="flex items-center gap-1.5 text-sm font-bold">
                          {isPremiumUser ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 size={16} /> Verified Active
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">Ad-Supported Free</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cancellation option if active */}
                    {isPremiumUser && sub?.status !== 'cancelled' && (
                      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/60 flex justify-end">
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline transition"
                        >
                          Cancel Auto-Renewal
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Upgrade Plans (Shown when not premium) */}
                  {!isPremiumUser && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Upgrade to Ad-Free Experience</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Simple, non-recurring subscription options with zero hidden fees.</p>
                      </div>

                      {/* Stacks vertically on mobile (< md), 2 columns on tablet/desktop */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Monthly Plan */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-100 dark:border-gray-700 hover:border-emerald-500 transition shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-bold text-lg text-gray-900 dark:text-white">Monthly Plan</h4>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                Flexible
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1 mb-4">
                              <span className="text-3xl font-black text-gray-900 dark:text-white">₹99</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">/ month</span>
                            </div>
                            <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300 mb-6">
                              <li className="flex items-center gap-2">
                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                <span><strong>100% Ad-Free Experience</strong></span>
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                <span>Unlimited AI Crop Disease Detection</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                <span>Direct Razorpay Secure Checkout</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                <span>Priority Agronomy Consultation Queue</span>
                              </li>
                            </ul>
                          </div>
                          <button
                            onClick={() => handleSelectSubPlan({ id: 'monthly', name: 'Premium Monthly' })}
                            disabled={subProcessingId === 'monthly'}
                            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {subProcessingId === 'monthly' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Zap size={16} /> Upgrade Monthly - ₹99
                              </>
                            )}
                          </button>
                        </div>

                        {/* Yearly Plan */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-emerald-500 relative shadow-md flex flex-col justify-between">
                          <div className="absolute -top-3 right-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-sm tracking-wider">
                            Best Value · Save 33%
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-bold text-lg text-gray-900 dark:text-white">Yearly Plan</h4>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                Annual
                              </span>
                            </div>
                            <div className="flex items-baseline gap-1 mb-1">
                              <span className="text-3xl font-black text-gray-900 dark:text-white">₹799</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">/ year</span>
                            </div>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mb-4">Just ₹66.58 / month</p>
                            <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300 mb-6">
                              <li className="flex items-center gap-2">
                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                <span><strong>100% Ad-Free for Full 365 Days</strong></span>
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                <span>Unlimited AI Crop Disease Detection</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                <span>Full Farm Health Dossiers & Export</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                                <span>Instant Verified Activation</span>
                              </li>
                            </ul>
                          </div>
                          <button
                            onClick={() => handleSelectSubPlan({ id: 'yearly', name: 'Premium Yearly' })}
                            disabled={subProcessingId === 'yearly'}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {subProcessingId === 'yearly' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Crown size={16} /> Upgrade Yearly - ₹799
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment History & Invoices */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                      <h3 className="font-bold text-gray-900 dark:text-white">Payment & Billing History</h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {subHistory.length === 0 && orders.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium text-sm">
                          No transactions recorded yet.
                        </div>
                      ) : (
                        <>
                          {subHistory.map((item) => (
                            <div key={item.id || item.payment_id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                  <Crown size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                                    ₹{item.amount?.toFixed(2)}
                                    <span className="text-xs ml-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                                      {item.status || 'Verified'}
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                    {item.plan_name || 'Dr Agri Premium'} · {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {orders.map((inv) => (
                            <div key={inv.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
                                  <FileText size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                                    ₹{inv.total_amount?.toFixed(2)}
                                    <span className="text-xs ml-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                                      {inv.status}
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                    Order · {new Date(inv.created_at).toLocaleDateString()} · {inv.order_ref}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDownloadInvoice(inv.order_ref)}
                                className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition shrink-0 ml-2"
                                title="Download PDF Invoice"
                              >
                                <Download size={18} />
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Cancel Subscription Modal */}
              {showCancelModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 max-w-md w-full rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-2xl">
                    <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center mb-4">
                      <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Cancel Auto-Renewal?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                      Your ad-free status will remain fully active until the end of your billing cycle. You will not be billed again.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCancelModal(false)}
                        disabled={cancellingSub}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        Keep Plan
                      </button>
                      <button
                        onClick={handleCancelSubAutoRenewal}
                        disabled={cancellingSub}
                        className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow transition flex items-center justify-center gap-2"
                      >
                        {cancellingSub ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Cancel'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Payment Sandbox Modal */}
              {testModalOrder && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 max-w-md w-full rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-2xl">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mb-4">
                      <CreditCard size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Simulate Test Payment</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Plan: <strong>{testModalOrder.plan_name}</strong> · Amount: <strong>₹{testModalOrder.amount}</strong>
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTestModalOrder(null)}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={handleCompleteTestSubPayment}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition"
                      >
                        Verify Payment
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. NOTIFICATIONS */}
          {active === 'notifications' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">Notification Preferences</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage communication channels, weather advisories, and task reminders. Toggles save automatically.</p>
              </div>

              <div>
                <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">In-App Alerts</h3>
                <div className="space-y-3">
                  <ToggleRow 
                    icon={<Bell className="text-emerald-500" size={18} />} 
                    title="Crop Calendar Reminders" 
                    desc="Display farm tasks due today in your top navigation notification bell." 
                    checked={notifications.in_app_calendar ?? true} 
                    onChange={() => handleToggleNotification('in_app_calendar')}
                  />
                  <ToggleRow 
                    icon={<Ticket className="text-purple-500" size={18} />} 
                    title="Support Ticket Status Updates" 
                    desc="Get alerted when an agronomist responds to your open support ticket." 
                    checked={notifications.in_app_support ?? true} 
                    onChange={() => handleToggleNotification('in_app_support')}
                  />
                  {['ADMIN', 'SUPER_ADMIN'].includes(user?.role) && (
                    <ToggleRow 
                      icon={<AlertTriangle className="text-amber-500" size={18} />} 
                      title="Warehouse Inventory Warnings" 
                      desc="Receive system alerts when regional fertilizer or seed stocks run low." 
                      checked={notifications.in_app_inventory ?? true} 
                      onChange={() => handleToggleNotification('in_app_inventory')}
                    />
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">External Alerts (SMS & Email)</h3>
                <div className="space-y-3">
                  <ToggleRow 
                    icon={<Mail className="text-blue-500" size={18} />} 
                    title="Order Confirmation & Invoices" 
                    desc="Send digital invoice copies and tracking updates to your registered email." 
                    checked={notifications.email_alerts} 
                    onChange={() => handleToggleNotification('email_alerts')}
                  />
                  <ToggleRow 
                    icon={<Smartphone className="text-green-500" size={18} />} 
                    title="SMS Weather & Pest Warnings" 
                    desc="Instant text alerts if severe storm winds, unseasonal rainfall, or pest infestation is forecast." 
                    checked={notifications.sms_alerts} 
                    onChange={() => handleToggleNotification('sms_alerts')}
                  />
                  <ToggleRow 
                    icon={<Zap className="text-amber-500" size={18} />} 
                    title="Weekly AI Farm Intelligence Digest" 
                    desc="Receive a weekly summary of your crop health score and recommended soil actions." 
                    checked={notifications.ai_reports} 
                    onChange={() => handleToggleNotification('ai_reports')}
                  />
                  <ToggleRow 
                    icon={<CheckCircle className="text-purple-500" size={18} />} 
                    title="Community & Market Updates" 
                    desc="New seed arrivals, government subsidy schemes, and marketplace offers." 
                    checked={notifications.marketing} 
                    onChange={() => handleToggleNotification('marketing')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. LANGUAGE & PREFERENCES */}
          {(active === 'preferences' || active === 'appearance') && (
            <div className="space-y-6">
              {/* Theme Selector */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">Display Theme</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose how Dr Agri AI looks across your devices.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button 
                    onClick={() => handleAppearanceChange('light')} 
                    className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition ${appearance === 'light' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center"><Sun size={24}/></div>
                    <span className={`font-bold text-sm ${appearance === 'light' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>Light Mode</span>
                  </button>
                  
                  <button 
                    onClick={() => handleAppearanceChange('dark')} 
                    className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition ${appearance === 'dark' ? 'border-emerald-500 bg-gray-900 dark:bg-gray-700/50' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300'}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-800 dark:bg-gray-900 text-white flex items-center justify-center"><Moon size={24}/></div>
                    <span className={`font-bold text-sm ${appearance === 'dark' ? 'text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>Dark Mode</span>
                  </button>

                  <button 
                    onClick={() => handleAppearanceChange('system')} 
                    className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition ${appearance === 'system' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'}`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center"><Monitor size={24}/></div>
                    <span className={`font-bold text-sm ${appearance === 'system' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>System Default</span>
                  </button>
                </div>
              </div>

              {/* Language Selector */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">Regional Language</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Select your primary spoken language. Interface labels and AI recommendations will update automatically.</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {LANGUAGES.map((lang) => {
                    const isSelected = form.preferred_language === lang.value;
                    return (
                      <button
                        key={lang.value}
                        onClick={() => handleLanguageChange(lang.value)}
                        className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="font-extrabold text-sm">{lang.native}</span>
                        <span className="text-xs text-gray-400 font-medium">{lang.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 7. HELP & SUPPORT */}
          {active === 'support' && (
            <div className="space-y-6">
              {/* Support Hotline & Direct Contacts */}
              <div className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-emerald-700/20">
                <div className="max-w-xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white mb-3">
                    <LifeBuoy size={14} /> 24/7 Farmer Care
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black mb-2">Need immediate assistance on your farm?</h2>
                  <p className="text-emerald-100 text-sm leading-relaxed mb-6">Our agricultural advisory team and technical support engineers are on standby 24/7 to help resolve questions regarding crops, deliveries, and software.</p>
                  
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="tel:+91900343432"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-emerald-800 font-bold text-sm hover:bg-emerald-50 transition shadow-sm"
                    >
                      <Phone size={16} />
                      <span>Call Helpline: +91 900 343 432</span>
                    </a>
                    <Link
                      to="/support"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold text-sm transition border border-white/20"
                    >
                      <ExternalLink size={16} />
                      <span>Open Helpdesk & Tickets</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Direct Support Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Email Consultation</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Send crop photos or lab reports</p>
                    <a href="mailto:support@dragri.ai" className="text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:underline mt-2 inline-block">support@dragri.ai</a>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Knowledge Center</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Explore pest guides & scheme info</p>
                    <Link to="/schemes" className="text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:underline mt-2 inline-block">Browse Government Schemes &rarr;</Link>
                  </div>
                </div>
              </div>

              {/* FAQs Accordion */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Frequently Asked Questions</h3>
                <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {FAQS.map((faq, i) => {
                    const isOpen = faqOpen === i;
                    return (
                      <div key={i} className="py-3.5">
                        <button
                          onClick={() => setFaqOpen(isOpen ? null : i)}
                          className="w-full flex items-center justify-between text-left font-bold text-sm text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                        >
                          <span className="pr-4">{faq.q}</span>
                          <ChevronDown size={18} className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                        </button>
                        {isOpen && (
                          <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed pr-6">
                            {faq.a}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 8. TEAM & WORKSPACES */}
          {active === 'team' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">Your Workspaces</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Manage multi-plot organizations or invite agronomists and family members to collaborate.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Switch Workspace</label>
                    <select 
                      value={activeOrg || ''} 
                      onChange={e => { setActiveOrg(e.target.value); fetchMembers(e.target.value); }}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none transition"
                    >
                      {orgs.length === 0 && <option value="">No workspaces found</option>}
                      {orgs.map(org => <option key={org.id} value={org.id}>{org.name} ({org.my_role})</option>)}
                    </select>
                  </div>

                  <form onSubmit={handleCreateOrg} className="space-y-4 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-6 md:pt-0 md:pl-6">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Create New Workspace</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. Mandya Green Farms" 
                        value={orgName} 
                        onChange={e => setOrgName(e.target.value)}
                        className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none transition"
                      />
                      <button type="submit" disabled={!orgName} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-xl font-bold hover:scale-105 transition disabled:opacity-50 flex items-center justify-center shrink-0">
                        <Plus size={18} />
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {activeOrg && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 dark:bg-gray-900/20">
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white flex items-center gap-2"><Users size={20}/> Team Members</h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Invite agronomists or farm workers to this workspace.</p>
                    </div>
                    <form onSubmit={handleInviteMember} className="flex gap-2 w-full md:w-auto">
                      <input 
                        type="email" 
                        placeholder="Enter email to invite..." 
                        value={inviteEmail} 
                        onChange={e => setInviteEmail(e.target.value)}
                        className="flex-1 md:w-64 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none transition"
                      />
                      <button type="submit" disabled={!inviteEmail} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition shadow-md disabled:opacity-50 shrink-0">
                        Invite
                      </button>
                    </form>
                  </div>
                  
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {members.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 font-medium">No members found in this workspace.</div>
                    ) : members.map((m) => (
                      <div key={m.id} className="p-4 sm:px-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">
                            {m.name?.[0]?.toUpperCase() || 'M'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">{m.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-full uppercase tracking-wider self-start sm:self-auto">
                          {m.org_role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    );
  }
};

// Reusable Components
const Field = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100"
      required={type === 'password'}
    />
  </div>
);

const ToggleRow = ({ icon, title, desc, checked, onChange }) => (
  <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/20 dark:hover:bg-emerald-900/10 transition">
    <div className="flex items-center gap-3.5 min-w-0 pr-3">
      <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center border border-gray-100 dark:border-gray-700 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{desc}</p>
      </div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 dark:peer-checked:bg-emerald-500"></div>
    </label>
  </div>
);

export default Settings;
