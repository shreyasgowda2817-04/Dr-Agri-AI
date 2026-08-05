import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUser, logout, setTokenFromOAuth } from './store/slices/authSlice';
import 'react-toastify/dist/ReactToastify.css';
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import RoleRoute from './components/layout/RoleRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TrackOrder from './pages/TrackOrder';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import Finance from './pages/Finance';
import FarmManager from './pages/FarmManager';
import Agronomy from './pages/Agronomy';
import Marketplace from './pages/Marketplace';
import Consultation from './pages/Consultation';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import ChatbotWidget from './components/chat/ChatbotWidget';
import OrderTracking from './pages/OrderTracking';
import CropManager from './pages/CropManager';
import OrderSuccess from './pages/OrderSuccess';
import Support from './pages/Support';
import ExpertDashboard from './pages/ExpertDashboard';
import Deliveries from './pages/Deliveries';

import Inventory from './pages/Inventory';
import Calendar from './pages/Calendar';
import DroneRecovery from './pages/DroneRecovery';
import MLOpsDashboard from './pages/MLOpsDashboard';
import CommodityPrices from './pages/CommodityPrices';
import EnterpriseB2B from './pages/EnterpriseB2B';
import CMS from './pages/CMS';
import PublicSchemes from './pages/PublicSchemes';
import PublicReport from './pages/PublicReport';
import { initGoogleTranslate, triggerTranslation } from './utils/googleTranslate';

function App() {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    // Check for OAuth token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      dispatch(setTokenFromOAuth(token));
      // Remove token from URL for security
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    dispatch(fetchUser());
    initGoogleTranslate();

    // Listen for global 401 unauth events from api.js
    const handleUnauthorized = () => {
      dispatch(logout());
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [dispatch]);

  // Apply Language Preferences
  useEffect(() => {
    if (user?.preferred_language) {
      const langCode = user.preferred_language.split('-')[0];
      // Slight delay to ensure the Google Translate widget has fully initialized in the DOM
      const timer = setTimeout(() => {
        triggerTranslation(langCode);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [user?.preferred_language]);

  // Apply theme class to HTML root
  useEffect(() => {
    const root = document.documentElement;
    const theme = user?.appearance || 'system';
    
    root.classList.remove('dark');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    }
  }, [user?.appearance]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
      <Routes>
        {/* Public Marketing Route */}
        <Route path="/" element={<Home />} />
        <Route path="/track" element={<TrackOrder />} />
        <Route path="/track/:orderRef" element={<TrackOrder />} />
        <Route path="/report/:id" element={<PublicReport />} />
        {/* Auth Routes (Split Screen Layout) */}
        <Route element={<AuthLayout />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>
        
        {/* Protected Dashboard Routes (Sidebar Layout) */}
        <Route element={<ProtectedRoute />}>
          <Route path="onboarding" element={<Onboarding />} />
          <Route element={<DashboardLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="scan" element={<Scan />} />
            <Route path="finance" element={<Finance />} />
            <Route path="farm" element={<FarmManager />} />
            <Route path="crops" element={<CropManager />} />
            <Route path="prices" element={<CommodityPrices />} />
            <Route path="drones" element={<DroneRecovery />} />
            <Route path="agronomy" element={<Agronomy />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="tracking/:orderId" element={<OrderTracking />} />
            <Route path="order-success/:orderId" element={<OrderSuccess />} />
            <Route path="consult" element={<Consultation />} />
            <Route path="support" element={<Support />} />
            <Route path="expert-dashboard" element={
              <RoleRoute allowedRoles={['AGRONOMY_EXPERT', 'ADMIN']}>
                <ExpertDashboard />
              </RoleRoute>
            } />
            <Route path="deliveries" element={
              <RoleRoute allowedRoles={['DELIVERY_PARTNER', 'ADMIN']}>
                <Deliveries />
              </RoleRoute>
            } />
            

            <Route path="inventory" element={
              <RoleRoute allowedRoles={['WAREHOUSE_MANAGER', 'ADMIN']}>
                <Inventory />
              </RoleRoute>
            } />

            <Route path="calendar" element={<Calendar />} />
            <Route path="b2b" element={
              <RoleRoute allowedRoles={['WAREHOUSE_MANAGER', 'ADMIN', 'SUPER_ADMIN']}>
                <EnterpriseB2B />
              </RoleRoute>
            } />
            <Route path="settings" element={<Settings />} />
            <Route path="admin" element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <Admin />
              </RoleRoute>
            } />
            <Route path="mlops" element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <MLOpsDashboard />
              </RoleRoute>
            } />
            <Route path="cms" element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <CMS />
              </RoleRoute>
            } />
          </Route>
          {/* Public or shared pages accessible without dashboard layout if needed, but we keep them inside for sidebar access */}
          <Route path="/schemes" element={
            <div className="min-h-screen bg-gray-50 pt-20 pb-12"><PublicSchemes /></div>
          } />
        </Route>
      </Routes>
      <ChatbotWidget />
    </>
  );
}

export default App;
