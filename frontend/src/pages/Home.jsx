import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Leaf, ShieldCheck, Sprout, Store, Zap, ArrowRight, Activity, TrendingUp, CheckCircle, Smartphone } from 'lucide-react';
import Footer from '../components/layout/Footer';

const Home = () => {
  const { t } = useTranslation();
  

  const { user } = useSelector((state) => state.auth);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-green-200 selection:text-green-900 dark:selection:bg-green-900 dark:selection:text-green-100 transition-colors duration-300">

      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg z-50 border-b border-gray-100 dark:border-gray-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-2.5 rounded-xl shadow-lg shadow-green-200 dark:shadow-none">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{t("dr_agri")}</span>
            </div>
            <div className="hidden md:flex space-x-8 text-sm font-bold text-gray-600 dark:text-gray-400">
              <a  href="#features" className="hover:text-green-600 dark:hover:text-green-400 transition">{t("platform")}</a>
              <a href="" className="hover:text-green-600 dark:hover:text-green-400 transition"></a>
             
            </div>
            <div className="flex items-center space-x-4">
              {!user && (
                <Link to="/login" className="text-gray-600 dark:text-gray-300 font-bold hover:text-green-600 dark:hover:text-green-400 transition hidden sm:block">
                  
                </Link>
              )}
              <Link to={user ? "/dashboard" : "/login"} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded-full font-bold shadow-xl hover:scale-105 transition flex items-center gap-2">{t("login")}<ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-0 pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
        
        {/* Dynamic Background */}
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-50 via-white to-white dark:from-green-900/20 dark:via-gray-950 dark:to-gray-950 -z-20"></div>
        
        {/* Watermark Farmer Background */}
        <div className="absolute inset-0 w-full h-full opacity-100 -z-[15] pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1592982537447-6f2334860dfa?q=80&w=2070&auto=format&fit=crop" 
            alt="Farmer Background" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Softening Overlay */}
        <div className="absolute inset-0 w-full h-full bg-white/40 dark:bg-gray-950/70 -z-[14] pointer-events-none"></div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-400/30 dark:bg-emerald-600/30 rounded-full blur-[100px] -z-10 animate-pulse"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200 font-bold text-sm mb-8 shadow-sm"
            >
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>{t("dr_agri_1_0_is_now_l")}</motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight mb-6 sm:mb-8 leading-[1.1] text-gray-900 dark:text-white"
            >{t("the_software_for")}<br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-green-400">{t("modern_agriculture_")}</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-xl text-gray-600 dark:text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed font-medium"
            >{t("detect_crop_diseases")}</motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 w-full sm:w-auto"
            >
              <Link to={user ? "/dashboard" : "/login"} className="bg-emerald-500 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-600 hover:-translate-y-1 transition-all text-center">{t("get_start")}</Link>
              <a href="#features" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">{t("explore_platform")}</a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bento Box Features */}
      <section id="features" className="py-16 sm:py-24 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-3 sm:mb-4">{t("enterprise_grade_int")}</h2>
            <p className="text-base sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl font-medium">{t("built_for_commercial")}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 md:auto-rows-[280px]">
            {/* Large Card 1 */}
            <div className="md:col-span-2 md:row-span-2 bg-white dark:bg-gray-950 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 border border-blue-100 dark:border-blue-800">
                    <Activity className="text-blue-500 w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-3 sm:mb-4 tracking-tight">{t("ai_computer_vision")}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-lg font-medium leading-relaxed max-w-md">{t("our_pytorch_powered_")}</p>
                </div>
                <div className="flex gap-2 mt-4 sm:mt-0">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg uppercase tracking-wider">{t("pytorch")}</span>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg uppercase tracking-wider">{t("98__accuracy")}</span>
                </div>
              </div>
              <Activity className="absolute -bottom-10 -right-10 w-64 h-64 text-blue-50 dark:text-blue-900/10 group-hover:scale-110 transition-transform duration-500" />
            </div>

            {/* Medium Card 1 */}
            <div className="md:col-span-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                  <Store className="text-white w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-tight">{t("integrated_e_commerc")}</h3>
                  <p className="text-green-50 font-medium text-sm sm:text-base">{t("when_a_disease_is_fo")}</p>
                </div>
              </div>
            </div>

            {/* Small Card 1 */}
            <div className="md:col-span-1 bg-white dark:bg-gray-950 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden hover:border-purple-400 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="text-purple-500 w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">{t("iot_telemetry")}</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">{t("connect_soil_moistur")}</p>
            </div>

            {/* Small Card 2 */}
            <div className="md:col-span-1 bg-white dark:bg-gray-950 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden hover:border-amber-400 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <Zap className="text-amber-500 w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">{t("ai_support")}</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">{t("24_7_fine_tuned_llm_")}</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};



export default Home;
