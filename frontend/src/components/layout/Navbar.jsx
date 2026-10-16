import { useState } from 'react';
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import { Leaf, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="fixed w-full z-50 glass shadow-sm bg-white/90 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" onClick={closeMenu} className="flex items-center space-x-2 text-green-600 hover:text-green-700 transition">
            <Leaf className="w-6 h-6" />
            <span className="font-bold text-xl tracking-tight">{t("dr_agri_ai") || "Dr Agri AI"}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-6 items-center">
            <Link to="/" className="text-gray-600 hover:text-green-600 font-medium transition text-sm">{t("home")}</Link>
            <Link to="/dashboard" className="text-gray-600 hover:text-green-600 font-medium transition text-sm">{t("dashboard")}</Link>
            <Link to="/finance" className="text-gray-600 hover:text-green-600 font-medium transition text-sm">{t("finance")}</Link>
            <Link to="/farm" className="text-gray-600 hover:text-green-600 font-medium transition text-sm">{t("plots")}</Link>
            <Link to="/agronomy" className="text-gray-600 hover:text-green-600 font-medium transition text-sm">{t("agronomy")}</Link>
            <Link to="/marketplace" className="text-gray-600 hover:text-green-600 font-medium transition text-sm">{t("market")}</Link>
            <Link to="/consult" className="text-gray-600 hover:text-green-600 font-medium transition text-sm">{t("consult")}</Link>
            <Link to="/settings" className="text-gray-600 hover:text-green-600 font-medium transition text-sm">{t("settings")}</Link>
            <div className="flex items-center space-x-3 ml-4 border-l pl-4 border-gray-300">
              <Link to="/login" className="text-gray-600 hover:text-green-600 font-medium transition text-sm">{t("login")}</Link>
              <Link to="/register" className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition shadow-md hover:shadow-lg">{t("get_started")}</Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-green-600 p-2 rounded-lg hover:bg-gray-100 transition focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-3 shadow-xl overflow-hidden"
          >
            <div className="flex flex-col space-y-2">
              <Link to="/" onClick={closeMenu} className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition">{t("home")}</Link>
              <Link to="/dashboard" onClick={closeMenu} className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition">{t("dashboard")}</Link>
              <Link to="/finance" onClick={closeMenu} className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition">{t("finance")}</Link>
              <Link to="/farm" onClick={closeMenu} className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition">{t("plots")}</Link>
              <Link to="/agronomy" onClick={closeMenu} className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition">{t("agronomy")}</Link>
              <Link to="/marketplace" onClick={closeMenu} className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition">{t("market")}</Link>
              <Link to="/consult" onClick={closeMenu} className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition">{t("consult")}</Link>
              <Link to="/settings" onClick={closeMenu} className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-green-50 hover:text-green-600 transition">{t("settings")}</Link>
            </div>
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              <Link to="/login" onClick={closeMenu} className="w-full text-center py-2.5 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition">{t("login")}</Link>
              <Link to="/register" onClick={closeMenu} className="w-full text-center py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition shadow">{t("get_started")}</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
