import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

const ForgotPassword = () => {
  const { t } = useTranslation();
  

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    

    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      className="w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-10 text-center lg:text-left">
        <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">{t("reset_password")}</h2>
        <p className="text-gray-500 text-lg">{t("enter_your_email_and")}</p>
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
          <h3 className="text-lg font-bold mb-2">{t("check_your_inbox")}</h3>
          <p className="text-green-700 text-sm mb-6">{t("we_ve_sent_a_passwor")}<strong>{email}</strong>{t("__the_link_will_expi")}</p>
          <Link 
            to="/login"
            className="inline-block bg-white border border-green-200 text-green-700 px-6 py-2.5 rounded-xl font-bold hover:bg-green-100 transition shadow-sm"
          >{t("back_to_login")}</Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">{t("email_address")}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Mail size={20} />
              </div>
              <input 
                type="email" 
                required 
                placeholder="Enter your registered email"
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-medium placeholder-gray-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !email}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold transition shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Send Reset Link"}
          </button>
        </form>
      )}

      {!success && (
        <div className="mt-8 text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition">
            <ArrowLeft size={16} />{t("back_to_sign_in")}</Link>
        </div>
      )}
    </motion.div>
  );
};

export default ForgotPassword;
