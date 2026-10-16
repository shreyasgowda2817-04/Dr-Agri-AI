import { useTranslation } from "react-i18next";
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Leaf } from 'lucide-react';

const ProtectedRoute = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);
  const location = useLocation();

  // Show a full-page branded loading screen during session restoration
  // Never redirect to login while session verification is in flight!
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-green-200 dark:border-green-800 border-t-green-600 dark:border-t-green-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-semibold text-sm tracking-wide animate-pulse">
            {t("verifying_session") || "Restoring Dr Agri AI Session..."}
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated after verification, redirect to login with return path
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated but not onboarded, redirect to onboarding (unless already there)
  if (!user.is_onboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
