import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';

const Register = () => {
  const { t } = useTranslation();
  

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'FARMER'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    

    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const getPasswordStrength = (pass) => {
    

    if (pass.length === 0) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (pass.match(/[A-Z]/)) strength += 25;
    if (pass.match(/[0-9]/)) strength += 25;
    if (pass.match(/[^A-Za-z0-9]/)) strength += 25;
    return strength;
  };

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    

    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (strength < 50) {
      setError("Please choose a stronger password.");
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const { confirmPassword, ...payload } = formData;
      await api.post('/auth/register', payload);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      className="w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8 text-center lg:text-left">
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">{t("create_account")}</h2>
        <p className="text-gray-500 text-lg"> </p>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm font-medium shadow-sm flex items-center gap-3"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></div>
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">{t("full_name")}</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <User size={20} />
            </div>
            <input 
              type="text" 
              name="name"
              required 
              placeholder="Enter your full name"
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-medium placeholder-gray-400"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">{t("email_address")}</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <Mail size={20} />
            </div>
            <input 
              type="email" 
              name="email"
              required 
              placeholder="Enter your email"
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-medium placeholder-gray-400"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">{t("password")}</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <Lock size={20} />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              name="password"
              required 
              placeholder="Create a strong password"
              className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-medium placeholder-gray-400"
              value={formData.password}
              onChange={handleChange}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-green-600 transition"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {formData.password && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1 text-xs font-bold text-gray-500">
                <span>{t("password_strength")}</span>
                <span className={strength < 50 ? 'text-red-500' : strength < 75 ? 'text-yellow-500' : 'text-green-600'}>
                  {strength < 50 ? 'Weak' : strength < 75 ? 'Good' : 'Strong'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 flex overflow-hidden gap-1">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${strength > 0 ? (strength < 50 ? 'bg-red-500 w-1/4' : strength < 75 ? 'bg-yellow-500 w-2/4' : 'bg-green-500 w-full') : 'w-0'}`}></div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2">{t("confirm_password")}</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <Lock size={20} />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              name="confirmPassword"
              required 
              placeholder="Confirm your password"
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-medium placeholder-gray-400"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold transition shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
            <>
              <ShieldCheck size={20} />{t("create_account")}</>
          )}
        </button>
      </form>

      <div className="mt-8 flex items-center gap-4 before:h-px before:flex-1 before:bg-gray-200 after:h-px after:flex-1 after:bg-gray-200">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("or_continue_with")}</span>
      </div>

      <div className="mt-6">
        <a 
          href={`${import.meta.env.VITE_API_URL || 'https://dr-agri-ai.onrender.com/api/v1'}/oauth/login/google`}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition font-bold text-gray-700 shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>{t("continue_with_google")}</a>
      </div>

      <p className="mt-8 text-center text-gray-500 font-medium">{t("already_have_an_acco")}<Link to="/login" className="text-green-600 font-bold hover:text-green-700 transition">{t("sign_in_here")}</Link>
      </p>
    </motion.div>
  );
};

export default Register;
