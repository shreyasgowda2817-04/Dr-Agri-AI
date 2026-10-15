import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationListener from '../NotificationListener';
import { useSelector, useDispatch } from 'react-redux';
import { ShoppingCart, Menu, Globe, Crown } from 'lucide-react';
import { openCart } from '../../store/slices/cartSlice';
import CartSidebar from '../cart/CartSidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import Footer from './Footer';
import GlobalSearch from './GlobalSearch';
import NotificationDropdown from './NotificationDropdown';


const DashboardLayout = () => {
  const { t } = useTranslation();
  

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { items } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { i18n } = useTranslation();
  const [isLangOpen, setIsLangOpen] = useState(false);

  const handleLanguageChange = async (newLang) => {
    localStorage.setItem("selectedLanguage", newLang);
    i18n.changeLanguage(newLang);

    setIsLangOpen(false);
    if (user) {
        try {
            await api.put('/auth/profile', { preferred_language: newLang + "-IN" });
        } catch (err) {}
    }
  };

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans relative transition-colors duration-200">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <NotificationListener />
      <CartSidebar />

      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'pl-64' : 'pl-20'}`}
      >
        {/* Top Navbar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 h-20 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm transition-colors">
          <div className="flex-1 flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              aria-label="Toggle Sidebar"
            >
              <Menu size={24} />
            </button>
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-4">
            <NotificationDropdown />

            {/* Language Selector */}
            <div className="relative">
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="relative bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl border border-gray-100 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-600 transition"
              >
                <Globe size={22} />
              </button>
              <AnimatePresence>
                {isLangOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 z-50"
                  >
                    <button onClick={() => handleLanguageChange('en')} className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${i18n.language === 'en' ? 'font-bold text-emerald-600' : 'text-gray-700 dark:text-gray-300'}`}>{t("_____english")}</button>
                    <button onClick={() => handleLanguageChange('kn')} className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${i18n.language === 'kn' ? 'font-bold text-emerald-600' : 'text-gray-700 dark:text-gray-300'}`}>{t("____________kannada_")}</button>
                    <button onClick={() => handleLanguageChange('hi')} className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${i18n.language === 'hi' ? 'font-bold text-emerald-600' : 'text-gray-700 dark:text-gray-300'}`}>{t("_____________hindi_")}</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* We moved cart button logic here */}
            <button 
              onClick={() => dispatch(openCart())}
              className="relative bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl border border-gray-100 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-600 transition"
            >
              <ShoppingCart size={22} />
              <AnimatePresence>
                {totalItems > 0 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-sm"
                  >
                    {totalItems}
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Subscription Tier Pill (shown only when active) */}
            {user && (user.is_premium || user.tier === 'pro') && (
              <Link
                to="/settings?tab=billing"
                title="Premium Active - Manage Subscription"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 text-xs font-bold hover:scale-105 transition"
              >
                <Crown size={14} className="text-amber-500" />
                <span>PREMIUM</span>
              </Link>
            )}

            <Link to="/settings" className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 border-2 border-white shadow-sm flex items-center justify-center text-white font-black text-sm overflow-hidden hover:shadow-md transition cursor-pointer">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AV'
              )}
            </Link>
          </div>
        </header>

        <main className="flex-grow flex flex-col pt-4">
          <div className="container mx-auto px-8 py-8 flex-grow">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default DashboardLayout;
