import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const RoleRoute = ({ allowedRoles, children }) => {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role?.toUpperCase() || 'FARMER';

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
