import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Plus, Minus, ShoppingCart, CreditCard, Banknote, QrCode, Tag } from 'lucide-react';
import { closeCart, removeItem, addItem, clearCart } from '../../store/slices/cartSlice';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const CartSidebar = () => {
  const { items, totalAmount, isOpen } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useSelector((state) => state.auth);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setLoading(true);

    let baseLat = 19.9975 + (Math.random() * 0.05);
    let baseLng = 73.7898 + (Math.random() * 0.05);

    const processPayment = async (finalLat, finalLng) => {
      try {
        const response = await api.post('/payments/create-checkout-session', { 
          items,
          payment_method: paymentMethod,
          coupon_code: couponCode,
          shipping_address: `Farmer's Registered Plot|${finalLat}|${finalLng}`
        });
        
        if (response.data.payment_type === 'cod') {
          dispatch(clearCart());
          dispatch(closeCart());
          toast.success(response.data.message);
          navigate(`/order-success/${response.data.order_ref}`);
          return;
        }

        // Razorpay Flow
        const options = {
          key: response.data.razorpay_key_id,
          amount: response.data.total * 100, // paisa
          currency: "INR",
          name: "Dr Agri AI",
          description: "Marketplace Purchase",
          order_id: response.data.razorpay_order_id,
          handler: async function (payment_response) {
            try {
              // Verify payment on backend
              await api.post('/payments/verify-payment', {
                razorpay_payment_id: payment_response.razorpay_payment_id,
                razorpay_order_id: payment_response.razorpay_order_id,
                razorpay_signature: payment_response.razorpay_signature,
                order_ref: response.data.order_ref
              });
              
              dispatch(clearCart());
              dispatch(closeCart());
              toast.success("Payment successful!");
              navigate(`/order-success/${response.data.order_ref}`);
            } catch (err) {
              console.error("Verification failed", err);
              toast.error("Payment verification failed.");
            }
          },
          prefill: {
            name: user?.name || "Farmer",
            email: user?.email || "farmer@dragri.ai",
            contact: "9999999999"
          },
          theme: {
            color: "#059669"
          },
          modal: {
            ondismiss: function() {
              setLoading(false);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          toast.error(resp.error.description);
          setLoading(false);
        });
        rzp.open();

      } catch (error) {
        console.error(error);
        toast.error("Checkout failed. Please try again.");
        setLoading(false);
      }
    };

    if ("geolocation" in navigator) {
      let resolved = false;
      const fallbackTimeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          toast.info("Using default location (Permission prompt timed out)");
          processPayment(baseLat, baseLng);
        }
      }, 3000);

      navigator.geolocation.getCurrentPosition(
        (pos) => { 
          if (!resolved) {
            resolved = true;
            clearTimeout(fallbackTimeout);
            processPayment(pos.coords.latitude, pos.coords.longitude); 
          }
        },
        (err) => { 
          if (!resolved) {
            resolved = true;
            clearTimeout(fallbackTimeout);
            processPayment(baseLat, baseLng); 
          }
        },
        { timeout: 3000 }
      );
    } else {
      processPayment(baseLat, baseLng);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => dispatch(closeCart())}
            className="fixed inset-0 bg-black z-50"
          />

          {/* Sidebar */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="text-green-600" /> 
                Your Cart
              </h2>
              <button 
                onClick={() => dispatch(closeCart())}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <ShoppingCart size={48} className="mb-4 opacity-20" />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 border border-gray-100 rounded-2xl bg-white shadow-sm">
                    <img src={item.image_url || "https://images.unsplash.com/photo-1592982537447-6f296d19488a?w=100"} alt={item.name} className="w-20 h-20 object-cover rounded-xl" />
                    
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{item.name}</h3>
                        <p className="text-green-600 font-bold mt-1">₹{item.price.toFixed(2)}</p>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                          <button onClick={() => dispatch(removeItem(item.id))} className="p-1 hover:bg-white rounded shadow-sm text-gray-500 transition">
                            <Minus size={14} />
                          </button>
                          <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                          <button onClick={() => dispatch(addItem(item))} className="p-1 hover:bg-white rounded shadow-sm text-gray-500 transition">
                            <Plus size={14} />
                          </button>
                        </div>
                        
                        <button onClick={() => dispatch(removeItem(item.id))} className="text-red-400 hover:text-red-600 transition p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Checkout Area */}
            {items.length > 0 && (
              <div className="p-5 border-t border-gray-100 bg-gray-50 flex flex-col gap-4">
                
                {/* Coupon Code */}
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Coupon Code" 
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                {/* Payment Methods */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Payment Method</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setPaymentMethod('card')} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition ${paymentMethod === 'card' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'}`}>
                      <CreditCard size={18} /> Card
                    </button>
                    <button onClick={() => setPaymentMethod('upi')} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition ${paymentMethod === 'upi' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'}`}>
                      <QrCode size={18} /> UPI
                    </button>
                    <button onClick={() => setPaymentMethod('cod')} className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition ${paymentMethod === 'cod' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'}`}>
                      <Banknote size={18} /> COD
                    </button>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-500 font-medium">Subtotal</span>
                  <span className="text-2xl font-black text-gray-900">₹{totalAmount.toFixed(2)}</span>
                </div>
                
                <button 
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartSidebar;
