import { useTranslation } from "react-i18next";
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RecommendedProducts = ({ result }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const products = result?.recommended_products || [];

  if (products.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <ShoppingBag className="text-emerald-500" size={24} />
          {t("recommended_products") || "Recommended Products"}
        </h3>
        <button 
          onClick={() => navigate('/marketplace')}
          className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          {t("view_all") || "View All"} <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((product, idx) => (
          <div key={idx} className="border border-gray-100 rounded-2xl p-4 hover:border-emerald-200 hover:shadow-md transition bg-gray-50 flex flex-col justify-between">
            <div>
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-32 object-contain mb-3 rounded-lg bg-white" />
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  <ShoppingBag className="text-gray-300" size={32} />
                </div>
              )}
              <h4 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2">{product.name}</h4>
              <p className="text-xs text-gray-500 mb-2">Dosage: {product.dosage_per_acre || "As directed"}</p>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="font-black text-emerald-600">₹{product.price}</span>
              <button 
                onClick={() => navigate(`/marketplace`)}
                className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition"
              >
                Buy Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default RecommendedProducts;
