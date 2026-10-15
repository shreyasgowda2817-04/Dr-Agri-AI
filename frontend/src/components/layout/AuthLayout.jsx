import { useTranslation } from "react-i18next";
import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';

const AuthLayout = () => {
  const { t } = useTranslation();
  

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
          <Link to="/" className="flex items-center gap-3 mb-12 hover:opacity-80 transition">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <Leaf className="w-8 h-8 text-green-300" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight">{t("dr_agri_ai")}</span>
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
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-24 bg-white relative">
        <div className="absolute top-8 left-8 lg:hidden">
          <Link to="/" className="flex items-center gap-2 text-green-700 font-bold">
            <Leaf className="w-6 h-6" />{t("dr_agri")}</Link>
        </div>
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>

    </div>
  );
};

export default AuthLayout;
