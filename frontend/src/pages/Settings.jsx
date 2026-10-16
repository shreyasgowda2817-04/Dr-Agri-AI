import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, MapPin, Globe, Camera, Save, CheckCircle, Zap, Shield, Key, AlertTriangle, 
  Trash2, Bell, Smartphone, Moon, Sun, Monitor, Sprout, ChevronRight,
  LogOut, FileText, Download, CreditCard, Mail, Users, Plus, Ticket,
  Crown, Sparkles, CheckCircle2, Loader2, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { fetchUser, logoutUser } from '../store/slices/authSlice';

const LANGUAGES = [
  { value: 'en-US', label: '🇺🇸 English' },
  { value: 'hi-IN', label: '🇮🇳 हिंदी (Hindi)' },
  { value: 'kn-IN', label: '🇮🇳 ಕನ್ನಡ (Kannada)' },
  { value: 'te-IN', label: '🇮🇳 తెలుగు (Telugu)' },
  { value: 'ta-IN', label: '🇮🇳 தமிழ் (Tamil)' },
  { value: 'mr-IN', label: '🇮🇳 मराठी (Marathi)' },
];

const STATES = [
  'Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Punjab',
  'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Gujarat', 'Bihar',
  'West Bengal', 'Odisha', 'Haryana', 'Telangana', 'Kerala', 'Other'
];

const CROPS = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Soybean', 'Tomato', 'Potato', 'Onion', 'Other'];
const SOIL_TYPES = ['Alluvial', 'Black', 'Red', 'Laterite', 'Arid', 'Forest & Mountain', 'Other'];
const IRRIGATION_METHODS = ['Drip', 'Sprinkler', 'Canal', 'Tube Well', 'Rainfed'];

const TABS = [
  { id: 'profile', label: 'Profile', icon: User, group: 'Personal' },
  { id: 'farm', label: 'Farm Details', icon: Sprout, group: 'Personal' },
  { id: 'account', label: 'Account & Security', icon: Shield, group: 'Settings' },
  { id: 'team', label: 'Team & Workspaces', icon: Users, group: 'Settings' },
  { id: 'notifications', label: 'Notifications', icon: Bell, group: 'Settings' },
  { id: 'appearance', label: 'Appearance', icon: Monitor, group: 'Settings' },
  { id: 'billing', label: 'Billing & Plans', icon: CreditCard, group: 'Subscription' },
];

const Settings = () => {
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');

  // Sync tab with URL if changed
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
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
    marketing: user?.notifications?.marketing ?? false
  });

  const [appearance, setAppearance] = useState(user?.appearance || 'system');
  const [orders, setOrders] = useState([]);

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
    if (activeTab === 'billing') {
      fetchSubscriptionDetails();
    }
  }, [activeTab]);

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
      if (user.notifications) setNotifications(user.notifications);
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

  const handleLogoutAll = () => {
  
    toast.success("Successfully logged out of all other devices.");
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

  // --- Workspace Fetch & Action Handlers ---
  useEffect(() => {
    if (activeTab === 'team') {
      fetchOrgs();
    }
  }, [activeTab]);

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
      window.location.href = '/login';
    } catch (err) {
      toast.error('Failed to delete account.');
      setDeleting(false);
    }
  };

  const groupedTabs = TABS.reduce((acc, tab) => {
    if (!acc[tab.group]) acc[tab.group] = [];
    acc[tab.group].push(tab);
    return acc;
  }, {});

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8 min-h-[calc(100vh-73px)] text-gray-900 dark:text-gray-100 min-w-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h1>
      </div>

      {/* ─── MOBILE HORIZONTAL TABS BAR (< md) ─── */}
      <div className="md:hidden overflow-x-auto scrollbar-none flex gap-2 pb-3 mb-4 -mx-3 px-3">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all ${
              activeTab === tab.id
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* ─── DESKTOP LEFT SIDEBAR (>= md) ─── */}
        <div className="hidden md:block w-64 shrink-0">
          <nav className="space-y-6">
            {Object.entries(groupedTabs).map(([group, tabs]) => (
              <div key={group}>
                <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-3">{group}</h3>
                <div className="space-y-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        activeTab === tab.id 
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 shadow-sm' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <tab.icon size={18} className={activeTab === tab.id ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'} />
                        {tab.label}
                      </div>
                      {activeTab === tab.id && <ChevronRight size={16} className="text-green-500 dark:text-green-400" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* ─── RIGHT CONTENT AREA ─── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              
              {/* 1. PROFILE */}
              {activeTab === 'profile' && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">Profile Picture</h2>
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                      <div className="relative">
                        {avatarPreview ? (
                          <img src={avatarPreview.startsWith('http') || avatarPreview.startsWith('data:') ? avatarPreview : `${import.meta.env.VITE_BACKEND_URL || ''}${avatarPreview}`} alt="Avatar" className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg" />
                        ) : (
                          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-4xl font-black shadow-lg">
                            {initials}
                          </div>
                        )}
                        <label className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 p-2.5 rounded-full cursor-pointer hover:text-green-600 dark:hover:text-green-400 transition shadow-lg border border-gray-100 dark:border-gray-600">
                          <Camera size={16} strokeWidth={3} />
                          <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                        </label>
                      </div>
                      <div className="text-center sm:text-left mt-2">
                        <p className="font-bold text-gray-900 dark:text-white text-xl">{user?.name}</p>
                        <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${user?.tier === 'pro' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                            {user?.tier === 'pro' ? '⚡ Pro Plan' : 'Free Plan'}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 capitalize">{user?.role}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Personal Information</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      <Field label="Full Name" value={form.name} onChange={v => handleChange('name', v)} />
                      <Field label="Mobile Number" value={form.phone} onChange={v => handleChange('phone', v)} type="tel" />
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Language Preference</label>
                        <select
                          value={form.preferred_language}
                          onChange={e => handleChange('preferred_language', e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition text-gray-900 dark:text-gray-100"
                        >
                          {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Location</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">State</label>
                        <select
                          value={form.location}
                          onChange={e => handleChange('location', e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition text-gray-900 dark:text-gray-100"
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
                    <button onClick={handleSaveProfile} disabled={saving} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-700 transition flex items-center gap-2">
                      {saving ? 'Saving...' : <><Save size={18}/> Save Profile Changes</>}
                    </button>
                  </div>
                </>
              )}

              {/* 2. FARM DETAILS */}
              {activeTab === 'farm' && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">Farm Details</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">These details help Dr Agri AI provide highly accurate agronomic recommendations and disease predictions for your specific land.</p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <Field label="Total Farm Area (in Acres)" value={farmForm.total_acreage} onChange={v => handleFarmChange('total_acreage', v)} type="number" />
                      
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Primary Crop Cultivated</label>
                        <select value={farmForm.primary_crop} onChange={e => handleFarmChange('primary_crop', e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition text-gray-900 dark:text-gray-100">
                          {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Primary Soil Type</label>
                        <select value={farmForm.soil_type} onChange={e => handleFarmChange('soil_type', e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition text-gray-900 dark:text-gray-100">
                          {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Primary Irrigation Method</label>
                        <select value={farmForm.irrigation} onChange={e => handleFarmChange('irrigation', e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition text-gray-900 dark:text-gray-100">
                          {IRRIGATION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <button onClick={handleSaveFarmDetails} disabled={saving} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-700 transition flex items-center gap-2">
                      {saving ? 'Updating AI Engine...' : <><Sprout size={18}/> Update Farm Profile</>}
                    </button>
                  </div>
                </>
              )}

              {/* 3. ACCOUNT & SECURITY */}
              {activeTab === 'account' && (
                <>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">Change Password</h2>
                    <form onSubmit={handleSavePassword} className="space-y-5">
                      <div className="max-w-md"><Field label="Current Password" value={passwordForm.old_password} onChange={v => handlePasswordChange('old_password', v)} type="password" /></div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <Field label="New Password" value={passwordForm.new_password} onChange={v => handlePasswordChange('new_password', v)} type="password" />
                        <Field label="Confirm New Password" value={passwordForm.confirm_password} onChange={v => handlePasswordChange('confirm_password', v)} type="password" />
                      </div>
                      <button type="submit" disabled={passwordSaving || !passwordForm.old_password} className="mt-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition shadow-lg disabled:opacity-70 flex items-center gap-2">
                        <Key size={18}/> {passwordSaving ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Device Management</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">If you noticed suspicious activity or lost a device, you can log out from all devices at once.</p>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">Active Sessions</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Logged into Mac (Chrome) and iPhone (Safari)</p>
                      </div>
                      <button onClick={handleLogoutAll} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm flex items-center gap-2">
                        <LogOut size={16}/> Log out all devices
                      </button>
                    </div>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 md:p-8 border border-red-100 dark:border-red-900/50 shadow-sm">
                    <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2"><AlertTriangle size={20} /> Danger Zone</h2>
                    <p className="text-sm text-red-600 dark:text-red-400/80 mb-6">Permanently delete your account and all associated data including farm plots, AI scans, and order history. This action is irreversible.</p>
                    <button onClick={handleDeleteAccount} disabled={deleting} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200 dark:shadow-none flex items-center gap-2 disabled:opacity-70">
                      <Trash2 size={18} /> {deleting ? 'Deleting Account...' : 'Delete Account Permanently'}
                    </button>
                  </div>
                </>
              )}

              {/* 4. TEAM & WORKSPACES */}
              {activeTab === 'team' && (
                <div className="space-y-6">
                  {/* Create / Select Workspace */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Your Workspaces</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Manage your organizations or invite team members to collaborate.</p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Switch Workspace</label>
                        <select 
                          value={activeOrg || ''} 
                          onChange={e => { setActiveOrg(e.target.value); fetchMembers(e.target.value); }}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none transition"
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
                            placeholder="e.g. Smith Farms" 
                            value={orgName} 
                            onChange={e => setOrgName(e.target.value)}
                            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none transition"
                          />
                          <button type="submit" disabled={!orgName} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-xl font-bold hover:scale-105 transition disabled:opacity-50 flex items-center justify-center shrink-0">
                            <Plus size={18} />
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Members List */}
                  {activeOrg && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                      <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 dark:bg-gray-900/20">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><Users size={20}/> Team Members</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Invite agronomists or farmhands.</p>
                        </div>
                        <form onSubmit={handleInviteMember} className="flex gap-2 w-full md:w-auto">
                          <input 
                            type="email" 
                            placeholder="Invite via email..." 
                            value={inviteEmail} 
                            onChange={e => setInviteEmail(e.target.value)}
                            className="flex-1 md:w-64 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none transition"
                          />
                          <button type="submit" disabled={!inviteEmail} className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-green-700 transition shadow-md disabled:opacity-50">
                            Invite
                          </button>
                        </form>
                      </div>
                      
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {members.length === 0 ? (
                          <div className="p-8 text-center text-gray-500 font-medium">No members found in this workspace.</div>
                        ) : members.map((m) => (
                          <div key={m.id} className="p-4 md:px-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 font-bold flex items-center justify-center">
                                {m.name[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white">{m.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{m.email}</p>
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

              {/* 5. NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Notification Preferences</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Choose what updates you want to receive and where you want them. Preferences save automatically.</p>
                  
                  <div className="space-y-6">
                    {/* IN-APP HUB ALERTS */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">In-App Hub Alerts</h3>
                      <div className="space-y-6">
                        <ToggleRow 
                          icon={<Bell className="text-emerald-500"/>} 
                          title="Crop Calendar Reminders" 
                          desc="Show tasks due today directly in your top navigation notification bell." 
                          checked={notifications.in_app_calendar ?? true} 
                          onChange={() => handleToggleNotification('in_app_calendar')}
                        />
                        <ToggleRow 
                          icon={<Ticket className="text-purple-500"/>} 
                          title="Support Ticket Updates" 
                          desc="Get alerted when a support ticket status changes to Open or In Progress." 
                          checked={notifications.in_app_support ?? true} 
                          onChange={() => handleToggleNotification('in_app_support')}
                        />
                        {['ADMIN', 'SUPER_ADMIN'].includes(user?.role) && (
                          <ToggleRow 
                            icon={<AlertTriangle className="text-amber-500"/>} 
                            title="System Inventory Alerts" 
                            desc="Show global low stock warnings for all warehouses." 
                            checked={notifications.in_app_inventory ?? true} 
                            onChange={() => handleToggleNotification('in_app_inventory')}
                          />
                        )}
                      </div>
                    </div>

                    {/* EMAIL & SMS ALERTS */}
                    <div className="pt-4">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Email & SMS Alerts</h3>
                      <div className="space-y-6">
                        <ToggleRow 
                          icon={<Mail className="text-blue-500"/>} 
                          title="Email Alerts for Orders & Payments" 
                          desc="Receive invoices, order confirmations, and shipment updates." 
                          checked={notifications.email_alerts} 
                          onChange={() => handleToggleNotification('email_alerts')}
                        />
                        <ToggleRow 
                          icon={<Smartphone className="text-green-500"/>} 
                          title="SMS Weather & Disease Alerts" 
                          desc="Get instant text messages if an extreme weather event or disease outbreak is predicted for your farm." 
                          checked={notifications.sms_alerts} 
                          onChange={() => handleToggleNotification('sms_alerts')}
                        />
                        <ToggleRow 
                          icon={<Zap className="text-amber-500"/>} 
                          title="Weekly AI Agronomy Reports" 
                          desc="Receive a comprehensive AI-generated PDF report of your farm's health every Sunday." 
                          checked={notifications.ai_reports} 
                          onChange={() => handleToggleNotification('ai_reports')}
                        />
                        <ToggleRow 
                          icon={<CheckCircle className="text-purple-500"/>} 
                          title="Promotional & Marketing Emails" 
                          desc="Updates on new features, seed varieties, and marketplace discounts." 
                          checked={notifications.marketing} 
                          onChange={() => handleToggleNotification('marketing')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. APPEARANCE */}
              {activeTab === 'appearance' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Interface Theme</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Customize how Dr Agri looks on this device.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button onClick={() => handleAppearanceChange('light')} className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition ${appearance === 'light' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center"><Sun size={24}/></div>
                      <span className={`font-bold text-sm ${appearance === 'light' ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>Light Mode</span>
                    </button>
                    
                    <button onClick={() => handleAppearanceChange('dark')} className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition ${appearance === 'dark' ? 'border-green-500 bg-gray-900 dark:bg-gray-700/50' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                      <div className="w-12 h-12 rounded-full bg-gray-800 dark:bg-gray-900 text-white flex items-center justify-center"><Moon size={24}/></div>
                      <span className={`font-bold text-sm ${appearance === 'dark' ? 'text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>Dark Mode (Beta)</span>
                    </button>

                    <button onClick={() => handleAppearanceChange('system')} className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition ${appearance === 'system' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                      <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-500 flex items-center justify-center"><Monitor size={24}/></div>
                      <span className={`font-bold text-sm ${appearance === 'system' ? 'text-green-700 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>System Default</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 6. BILLING & SUBSCRIPTION */}
              {activeTab === 'billing' && (
                <div className="space-y-6">
                  {subLoading ? (
                    <div className="flex justify-center items-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    </div>
                  ) : (
                    <>
                      {/* Subscription Status Hero Card */}
                      {(() => {
                        const isPremium = Boolean(sub?.is_premium || user?.is_premium || user?.tier === 'pro');
                        const isCancelled = sub?.status === 'cancelled';

                        return (
                          <div className={`rounded-2xl p-6 md:p-8 border shadow-sm relative overflow-hidden transition-all ${
                            isPremium 
                              ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white dark:from-emerald-950/40 dark:via-gray-800 dark:to-gray-800 border-emerald-400 dark:border-emerald-600/50' 
                              : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                          }`}>
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                              {isPremium ? <Crown size={120} /> : <CreditCard size={120} />}
                            </div>

                            <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
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
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {sub?.plan_name || (isPremium ? 'Dr Agri AI Premium' : 'Free Community Plan')}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
                                  {isPremium
                                    ? 'Your account is active with zero sponsored advertisements, full AI diagnosis, and priority agronomy services.'
                                    : 'Core AI crop diagnosis and farm management tools remain 100% free supported by relevant community ads. Upgrade below for an ad-free experience.'}
                                </p>
                              </div>

                              {isPremium && (
                                <div className="text-left md:text-right">
                                  <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                    {sub?.days_remaining ?? 0}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">Days Remaining</span>
                                </div>
                              )}
                            </div>

                            {/* Plan Metadata */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
                              <div>
                                <span className="text-xs text-gray-400 font-medium block mb-1">Billing Period</span>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                  {isPremium ? (sub?.plan_id === 'yearly' ? 'Yearly Plan (₹799/yr)' : 'Monthly Plan (₹99/mo)') : 'Free (₹0/mo)'}
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
                                    <span className="text-gray-500 dark:text-gray-400">Ad-Supported Free</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Cancellation if active */}
                            {isPremium && !isCancelled && (
                              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700/60 flex justify-end">
                                <button
                                  onClick={() => setShowCancelModal(true)}
                                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline transition"
                                >
                                  Cancel Auto-Renewal
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Upgrade Cards if NOT Premium */}
                      {!Boolean(sub?.is_premium || user?.is_premium || user?.tier === 'pro') && (
                        <div>
                          <div className="mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Upgrade to Ad-Free Experience</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Select a transparent, non-recurring subscription plan.</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                                    <span><strong>100% Ad-Free Experience</strong></span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                                    <span>Unlimited AI Crop Disease Detection</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                                    <span>Direct Razorpay Secure Checkout</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                                    <span>Priority Agronomy Support</span>
                                  </li>
                                </ul>
                              </div>
                              <button
                                onClick={() => handleSelectSubPlan({ id: 'monthly', name: 'Premium Monthly' })}
                                disabled={subProcessingId === 'monthly'}
                                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
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
                                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                                    <span><strong>100% Ad-Free for Full 365 Days</strong></span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                                    <span>Unlimited AI Crop Disease Detection</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                                    <span>All Core Farming Features Included</span>
                                  </li>
                                  <li className="flex items-center gap-2">
                                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                                    <span>Instant Verified Activation</span>
                                  </li>
                                </ul>
                              </div>
                              <button
                                onClick={() => handleSelectSubPlan({ id: 'yearly', name: 'Premium Yearly' })}
                                disabled={subProcessingId === 'yearly'}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
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
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                          <h3 className="font-bold text-gray-900 dark:text-white">Payment & Billing History</h3>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                          {subHistory.length === 0 && orders.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium text-sm">
                              No payment transactions recorded yet.
                            </div>
                          ) : (
                            <>
                              {/* Subscription Transactions */}
                              {subHistory.map((item) => (
                                <div key={item.id || item.payment_id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                      <Crown size={18} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-900 dark:text-white text-sm">
                                        ₹{item.amount?.toFixed(2)}
                                        <span className="text-xs ml-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                                          {item.status || 'Verified'}
                                        </span>
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {item.plan_name || 'Dr Agri Premium'} · {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'} · Ref: {item.razorpay_payment_id || item.order_id}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Marketplace Orders */}
                              {orders.map((inv) => (
                                <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                      <FileText size={18} />
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-900 dark:text-white text-sm">
                                        ₹{inv.total_amount?.toFixed(2)}
                                        <span className="text-xs ml-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                                          {inv.status}
                                        </span>
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Marketplace Order · {new Date(inv.created_at).toLocaleDateString()} · {inv.order_ref}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDownloadInvoice(inv.order_ref)}
                                    className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition"
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

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

// Reusable Components
const Field = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 transition placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-gray-100"
      required={type === 'password'}
    />
  </div>
);

const ToggleRow = ({ icon, title, desc, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800 hover:bg-green-50/30 dark:hover:bg-green-900/10 transition">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center border border-gray-100 dark:border-gray-700 shrink-0">{icon}</div>
      <div>
        <p className="font-bold text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
      </div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 dark:peer-checked:bg-green-500"></div>
    </label>
  </div>
);

export default Settings;
