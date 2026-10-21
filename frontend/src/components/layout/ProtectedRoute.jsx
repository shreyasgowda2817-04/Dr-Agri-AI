import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const ProtectedRoute = () => {
  const { user, isAuthenticated, isInitializing, authLoading } = useSelector((state) => state.auth);
  const location = useLocation();

  // If session is still initializing on app startup, wait for session check before redirecting
  if (isInitializing || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09291F] text-white select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin"></div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200/70">Verifying session...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login with return path
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated but not onboarded, redirect to onboarding (unless already there)
  if (user && !user.is_onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
