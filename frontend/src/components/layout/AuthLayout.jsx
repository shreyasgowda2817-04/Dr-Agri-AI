import { useTranslation } from "react-i18next";
import { Outlet, Link, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { LogoIcon } from '../common/AppLogo';

const AuthLayout = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();



  // Redirect authenticated farmers away from login & registration pages
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
      {/* Left side: Branding / Image */}
      <div className="hidden lg:flex w-1/2 bg-green-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=2070&auto=format&fit=crop" 
            alt="Agriculture background" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/90 to-green-800/80"></div>
        
        <div className="relative z-10 p-12 max-w-xl text-white">
          <Link to="/" className="flex items-center gap-3 mb-12 hover:opacity-90 transition group">
            <LogoIcon size={52} className="shadow-xl shadow-emerald-950/40" />
            <div className="flex items-center gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-white">{t("dr_agri")}</span>
              <span className="px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm">AI</span>
            </div>
          </Link>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-bold mb-6 leading-tight"
          >{t("empowering_modern_fa")}</motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-green-100 text-lg text-opacity-90 leading-relaxed"
          >{t("join_thousands_of_sm")}</motion.p>
        </div>
      </div>

      {/* Right side: Form (Outlet) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 py-12 sm:p-8 lg:p-16 xl:p-24 bg-white relative min-w-0">
        <div className="absolute top-4 left-4 sm:top-8 sm:left-8 lg:hidden">
          <Link to="/" className="flex items-center gap-2 text-gray-900 font-extrabold text-sm sm:text-base group">
            <LogoIcon size={30} />
            <span>{t("dr_agri")}</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-emerald-600 text-white">AI</span>
          </Link>
        </div>
        <div className="w-full max-w-md mt-6 sm:mt-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
