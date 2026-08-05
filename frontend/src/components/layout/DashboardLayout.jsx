import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationListener from '../NotificationListener';
import { useSelector, useDispatch } from 'react-redux';
import { ShoppingCart, Menu } from 'lucide-react';
import { openCart } from '../../store/slices/cartSlice';
import CartSidebar from '../cart/CartSidebar';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from './Footer';
import GlobalSearch from './GlobalSearch';
import NotificationDropdown from './NotificationDropdown';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { items } = useSelector((state) => state.cart);
  const dispatch = useDispatch();

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
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 border-2 border-white shadow-sm flex items-center justify-center text-white font-black text-sm">
              AV
            </div>
          </div>
        </header>

        <main className="flex-grow flex flex-col relative z-10 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto px-8 py-8 flex-grow"
          >
            <Outlet />
          </motion.div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default DashboardLayout;
