import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { restoreSession, logout, setTokenFromOAuth } from './store/slices/authSlice';
import 'react-toastify/dist/ReactToastify.css';
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import RoleRoute from './components/layout/RoleRoute';
import { lazy, Suspense } from 'react';
import ChatbotWidget from './components/chat/ChatbotWidget';


// Lazy loaded pages for performance
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Scan = lazy(() => import('./pages/Scan'));
const Finance = lazy(() => import('./pages/Finance'));
const FarmManager = lazy(() => import('./pages/FarmManager'));
const Agronomy = lazy(() => import('./pages/Agronomy'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Consultation = lazy(() => import('./pages/Consultation'));
const Settings = lazy(() => import('./pages/Settings'));
const Admin = lazy(() => import('./pages/Admin'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const CropManager = lazy(() => import('./pages/CropManager'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Support = lazy(() => import('./pages/Support'));
const ExpertDashboard = lazy(() => import('./pages/ExpertDashboard'));
const Deliveries = lazy(() => import('./pages/Deliveries'));
const SubscriptionPlans = lazy(() => import('./pages/SubscriptionPlans'));
const ManageSubscription = lazy(() => import('./pages/ManageSubscription'));
const AdvertiserDashboard = lazy(() => import('./pages/AdvertiserDashboard'));

const PageLoader = () => (
  <div className="flex h-[80vh] items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
  </div>
);

import Inventory from './pages/Inventory';
import Calendar from './pages/Calendar';
import DroneRecovery from './pages/DroneRecovery';
import MLOpsDashboard from './pages/MLOpsDashboard';
import CommodityPrices from './pages/CommodityPrices';
import EnterpriseB2B from './pages/EnterpriseB2B';
import CMS from './pages/CMS';
import PublicSchemes from './pages/PublicSchemes';
import PublicReport from './pages/PublicReport';


function App() {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    // Check for OAuth token in URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refreshToken = params.get('refresh_token');
    if (token) {
      dispatch(setTokenFromOAuth({ token, refreshToken }));
      // Remove tokens from URL for security
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    dispatch(restoreSession());



    // Listen for global 401 unauth events from api.js
    const handleUnauthorized = () => {
      dispatch(logout());
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [dispatch]);



  // Apply theme class to HTML root
  useEffect(() => {
    const root = document.documentElement;
    // Prefer user setting from DB -> then LocalStorage -> then System
    const theme = user?.appearance || localStorage.getItem('theme') || 'system';
    
    root.classList.remove('dark');
    
    if (theme === 'dark') {
      root.classList.add('dark');
      if (!user) localStorage.setItem('theme', 'dark');
    } else if (theme === 'light') {
      if (!user) localStorage.setItem('theme', 'light');
    } else if (theme === 'system') {
      if (!user) localStorage.removeItem('theme'); // Clean up guest theme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      }
    }
  }, [user?.appearance]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
      <Suspense fallback={<PageLoader />}><Routes>
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
            <Route path="notifications" element={<Notifications />} />
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
            <Route path="settings/:section" element={<Settings />} />
            <Route path="subscription/plans" element={<Navigate to="/settings?tab=billing" replace />} />
            <Route path="subscription/manage" element={<Navigate to="/settings?tab=billing" replace />} />
            <Route path="advertiser" element={
              <RoleRoute allowedRoles={['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']}>
                <AdvertiserDashboard />
              </RoleRoute>
            } />
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
      </Routes></Suspense>
      <ChatbotWidget />
    </>
  );
}

export default App;
