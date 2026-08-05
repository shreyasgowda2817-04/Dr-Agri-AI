import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Leaf, ShieldCheck, Sprout, Store, Zap, ArrowRight, Activity, TrendingUp, CheckCircle, Smartphone } from 'lucide-react';
import Footer from '../components/layout/Footer';

const Home = () => {
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
              <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Dr Agri</span>
            </div>
            <div className="hidden md:flex space-x-8 text-sm font-bold text-gray-600 dark:text-gray-400">
              <a href="#features" className="hover:text-green-600 dark:hover:text-green-400 transition">Platform</a>
              <a href="#marketplace" className="hover:text-green-600 dark:hover:text-green-400 transition">Marketplace</a>
              <a href="#pricing" className="hover:text-green-600 dark:hover:text-green-400 transition"></a>
            </div>
            <div className="flex items-center space-x-4">
              {!user && (
                <Link to="/login" className="text-gray-600 dark:text-gray-300 font-bold hover:text-green-600 dark:hover:text-green-400 transition hidden sm:block">
                  Sign In
                </Link>
              )}
              <Link to={user ? "/dashboard" : "/login"} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-2.5 rounded-full font-bold shadow-xl hover:scale-105 transition flex items-center gap-2">
                Login
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
        
        {/* Dynamic Background */}
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-50 via-white to-white dark:from-green-900/20 dark:via-gray-950 dark:to-gray-950 -z-20"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-400/20 dark:bg-emerald-600/20 rounded-full blur-[100px] -z-10 animate-pulse"></div>

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
              </span>
              Dr Agri 1.0 is now live
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[1.1] text-gray-900 dark:text-white"
            >
              The Operating System for <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-green-400">Modern Agriculture.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium"
            >
              Detect crop diseases instantly with AI, purchase certified treatments, and manage your entire farming operation from a single, vertically integrated platform.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row justify-center gap-4"
            >
              <Link to={user ? "/dashboard" : "/login"} className="bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-600 hover:-translate-y-1 transition-all">
                Get Start
              </Link>
              <a href="#features" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                Explore Platform
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bento Box Features */}
      <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-4">Enterprise Grade Intelligence.</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl font-medium">Built for commercial farms and agribusinesses that demand scale, precision, and absolute security.</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 auto-rows-[280px]">
            {/* Large Card 1 */}
            <div className="md:col-span-2 md:row-span-2 bg-white dark:bg-gray-950 rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 border border-blue-100 dark:border-blue-800">
                    <Activity className="text-blue-500 w-7 h-7" />
                  </div>
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">AI Computer Vision</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg font-medium leading-relaxed max-w-md">Our PyTorch-powered computer vision engine identifies over 150 crop diseases with 98% accuracy from a single leaf photo. Real-time inference on edge devices.</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg uppercase tracking-wider">PyTorch</span>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg uppercase tracking-wider">98% Accuracy</span>
                </div>
              </div>
              <Activity className="absolute -bottom-10 -right-10 w-64 h-64 text-blue-50 dark:text-blue-900/10 group-hover:scale-110 transition-transform duration-500" />
            </div>

            {/* Medium Card 1 */}
            <div className="md:col-span-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-8 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                  <Store className="text-white w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Integrated E-Commerce</h3>
                  <p className="text-green-50 font-medium">When a disease is found, our system deterministically matches it with certified treatments from our verified warehouses. One-click checkout.</p>
                </div>
              </div>
            </div>

            {/* Small Card 1 */}
            <div className="md:col-span-1 bg-white dark:bg-gray-950 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden hover:border-purple-400 transition-colors">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="text-purple-500 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">IoT Telemetry</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Connect soil moisture and humidity sensors via WebSockets.</p>
            </div>

            {/* Small Card 2 */}
            <div className="md:col-span-1 bg-white dark:bg-gray-950 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden hover:border-amber-400 transition-colors">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-4">
                <Zap className="text-amber-500 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">AI Support</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">24/7 fine-tuned LLM chatbot for instant farm advice.</p>
            </div>
          </div>
        </div>
      </section>


      <Footer />
    </div>
  );
};



export default Home;
