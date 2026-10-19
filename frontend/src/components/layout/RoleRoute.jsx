import { useTranslation } from "react-i18next";
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const RoleRoute = ({ allowedRoles, children }) => {
  const { t } = useTranslation();
  const { user, isRestoring, isInitializing, authLoading } = useSelector((state) => state.auth);

  // Attempt fallback to cached user if state hasn't populated yet
  let effectiveUser = user;
  if (!effectiveUser) {
    try {
      const stored = localStorage.getItem('user');
      if (stored) effectiveUser = JSON.parse(stored);
    } catch (e) {}
  }

  if (!effectiveUser && (isRestoring || isInitializing || authLoading)) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (!effectiveUser) {
    return <Navigate to="/login" replace />;
  }

  const userRole = effectiveUser.role?.toUpperCase() || 'FARMER';

  // SUPER_ADMIN has access to everything
  if (userRole === 'SUPER_ADMIN') {
    return children;
  }

  // Check if user's role is in the allowedRoles array
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // If not allowed, redirect to their default dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RoleRoute;
