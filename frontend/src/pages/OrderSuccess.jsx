import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, FileText, Truck, ArrowRight } from 'lucide-react';
import api from '../services/api';

const OrderSuccess = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/invoices/${orderId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Failed to download invoice.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl overflow-hidden text-center"
      >
        <div className="bg-green-600 py-12 flex flex-col items-center justify-center text-white">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ delay: 0.2, type: "spring" }}
          >
            <CheckCircle size={80} />
          </motion.div>
          <h1 className="text-4xl font-extrabold mt-6">Order Successful!</h1>
          <p className="text-green-100 mt-2 font-medium text-lg">Thank you for shopping with Dr Agri AI.</p>
        </div>

        <div className="p-8">
          <p className="text-gray-500 mb-6">
            Your order <strong className="text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">{orderId}</strong> has been successfully placed. We have sent a purchase receipt to your email.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <button 
              onClick={handleDownloadInvoice}
              disabled={downloading}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition disabled:opacity-50"
            >
              <FileText size={20} />
              {downloading ? 'Generating PDF...' : 'Download Invoice'}
            </button>
            <button 
              onClick={() => navigate(`/tracking/${orderId}`)}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
            >
              <Truck size={20} />
              Track Delivery
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <button 
              onClick={() => navigate('/marketplace')}
              className="text-green-600 font-bold flex items-center justify-center gap-2 mx-auto hover:text-green-700 transition"
            >
              Continue Shopping <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderSuccess;
