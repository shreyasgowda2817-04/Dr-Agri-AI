import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';

const ResetPassword = () => {
  const { t } = useTranslation();
  

  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // If no token in URL, redirect or show error immediately
  useEffect(() => {
    if (!token) {
      setError("Invalid or missing password reset link.");
    }
  }, [token]);

  const getPasswordStrength = (pass) => {
    

    if (pass.length === 0) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (pass.match(/[A-Z]/)) strength += 25;
    if (pass.match(/[0-9]/)) strength += 25;
    if (pass.match(/[^A-Za-z0-9]/)) strength += 25;
    return strength;
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    

    e.preventDefault();
    if (password !== confirmPassword) {
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
      await api.post('/auth/reset-password', {
        token: token,
        new_password: password
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. The link might be expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("invalid_link")}</h2>
        <p className="text-gray-500 mb-6">{t("this_password_reset_")}</p>
        <Link to="/forgot-password" className="text-green-600 font-bold hover:underline">{t("request_a_new_link")}</Link>
      </div>
    );
  }

  return (
    <motion.div 
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">{t("create_new_password")}</h2>
        <p className="text-gray-500 text-lg">{t("your_new_password_mu")}</p>
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

      {success ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-2xl mb-6 text-center shadow-sm"
        >
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-lg font-bold mb-2">{t("password_updated_")}</h3>
          <p className="text-green-700 text-sm mb-6">{t("your_password_has_be")}</p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">{t("new_password")}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Lock size={20} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                placeholder="Enter new password"
                className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-medium placeholder-gray-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-green-600 transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {password && (
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
                required 
                placeholder="Confirm new password"
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-medium placeholder-gray-400"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !password}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold transition shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                <ShieldCheck size={20} />{t("reset_password")}</>
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
};

export default ResetPassword;
