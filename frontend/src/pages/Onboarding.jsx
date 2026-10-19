import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUser } from '../store/slices/authSlice';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Sprout, ArrowRight, CheckCircle, Leaf, Target, Sparkles, Building2, User } from 'lucide-react';

const Onboarding = () => {
  const { t } = useTranslation();
  

  const [step, setStep] = useState(1);
  const [location, setLocation] = useState('');
  const [farmType, setFarmType] = useState('');
  const [crops, setCrops] = useState([]);
  const [farmSize, setFarmSize] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // If already onboarded, redirect
  useEffect(() => {
    if (user && user.is_onboarded) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const cropOptions = ['Wheat', 'Rice', 'Corn', 'Tomato', 'Potato', 'Cotton', 'Sugarcane', 'Soybean'];

  const toggleCrop = (crop) => {
    

    if (crops.includes(crop)) {
      setCrops(crops.filter(c => c !== crop));
    } else {
      setCrops([...crops, crop]);
    }
  };

  const handleComplete = async () => {
    

    setLoading(true);
    try {
      // Send onboarding data to the correct dedicated endpoint
      await api.post('/auth/onboarding', {
        location: location,
        crops: crops,
        farm_size: farmSize || '10'
      });
      
      // We can also optionally update the farm_details via profile if we want
      await api.put('/auth/profile', {
        farm_details: {
          primary_crop: crops[0] || 'Mixed',
          total_acreage: farmSize || '10',
          type: farmType
        }
      });

      // Refresh user to get is_onboarded = true
      await dispatch(fetchUser());
      navigate('/dashboard');
    } catch (error) {
      console.error("Onboarding failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex font-sans transition-colors duration-300">

      {/* Left Panel: Form Wizard */}
      <div className="w-full lg:w-[55%] flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 relative">
        
        {/* Brand Header */}
        <div className="absolute top-8 left-8 sm:left-16 lg:left-24 xl:left-32 flex items-center gap-3">
          <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-2 rounded-xl shadow-lg shadow-green-200 dark:shadow-none">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white">{t("dr_agri")}</span>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-2 mb-12 mt-20">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
              <motion.div 
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: step >= i ? '100%' : '0%' }}
                transition={{ duration: 0.5 }}
              />
            </div>
          ))}
        </div>

        <div className="max-w-md w-full">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">{t("welcome_to_dr_agri_")}</h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{t("let_s_set_up_your_wo")}</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-gray-200 mb-2">{t("workspace_type")}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setFarmType('individual')} className={`p-4 rounded-2xl border-2 flex flex-col gap-2 transition-all ${farmType === 'individual' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'}`}>
                        <User className={farmType === 'individual' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'} size={24} />
                        <span className={`font-bold ${farmType === 'individual' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>{t("individual_farm")}</span>
                      </button>
                      <button onClick={() => setFarmType('enterprise')} className={`p-4 rounded-2xl border-2 flex flex-col gap-2 transition-all ${farmType === 'enterprise' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'}`}>
                        <Building2 className={farmType === 'enterprise' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'} size={24} />
                        <span className={`font-bold ${farmType === 'enterprise' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>{t("enterprise___co_op")}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-gray-200 mb-2">{t("primary_location")}</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input 
                        type="text" 
                        placeholder="State, Country (e.g. California, US)" 
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-900 dark:text-white font-medium"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  disabled={!location || !farmType}
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-xl font-bold hover:scale-[1.02] transition-transform shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 mt-4"
                >{t("continue")}<ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3">{t("crop_configuration")}</h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{t("select the primary crop")}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {cropOptions.map(crop => (
                    <button
                      key={crop}
                      onClick={() => toggleCrop(crop)}
                      className={`p-4 rounded-xl border-2 font-bold text-sm transition-all ${
                        crops.includes(crop) 
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      {crop}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-gray-200 mb-2 mt-4">{t("total_acreage__optio")}</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 50" 
                    className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-gray-900 dark:text-white font-medium"
                    value={farmSize}
                    onChange={(e) => setFarmSize(e.target.value)}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="w-1/3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-4 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >{t("back")}</button>
                  <button 
                    onClick={() => setStep(3)}
                    disabled={crops.length === 0}
                    className="w-2/3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-xl font-bold hover:scale-[1.02] transition-transform shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                  >{t("next_step")}<ArrowRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 text-center mt-10"
              >
                <div className="flex justify-center mb-6 relative">
                  <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                  <div className="bg-gradient-to-br from-emerald-400 to-green-600 p-5 rounded-3xl shadow-xl relative z-10 text-white">
                    <CheckCircle className="w-12 h-12" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{t("workspace_ready")}</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-12 max-w-sm mx-auto">{t("your_ecosystem_is_co")}</p>
                
                <button 
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 hover:scale-[1.02] transition-all shadow-xl shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? 'Initializing Core...' : <><Sparkles size={20} />{t("enter_command_center")}</>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Panel: Artistic/Brand Graphic */}
      <div className="hidden lg:flex w-[45%] bg-gray-900 relative overflow-hidden items-center justify-center">
        {/* Dynamic Abstract Background */}
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/40 via-gray-900 to-gray-950"></div>
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px]"></div>

        <div className="relative z-10 max-w-md text-center">
          <div className="w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-2xl">
            <Target className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 leading-tight">{t("data_driven_agricult")}</h2>
          <p className="text-gray-400 font-medium leading-relaxed">{t("join_thousands_of_co")}</p>
        </div>
      </div>

    </div>
  );
};

export default Onboarding;
