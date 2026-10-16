import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addItem, openCart } from '../store/slices/cartSlice';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import {
  ShoppingCart, Search, Star, Heart, X, Package,
  Handshake, TrendingUp, Plus, Tag, ChevronDown, CheckCircle,
  Leaf, Zap, Truck, ShieldCheck, ClipboardList, Navigation, FileText
} from 'lucide-react';
import { toast } from 'react-toastify';
import SponsoredAds from '../components/ads/SponsoredAds';

// ─── Category config ────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: 'All', value: 'all', icon: '🌾' },
  { label: 'Seeds', value: 'Seeds', icon: '🌱' },
  { label: 'Nursery', value: 'Nursery', icon: '🪴' },
  { label: 'Organic Fert.', value: 'Organic Fertilizer', icon: '♻️' },
  { label: 'Fertilizer', value: 'Fertilizer', icon: '🧪' },
  { label: 'Bio Fertilizer', value: 'Bio Fertilizer', icon: '🦠' },
  { label: 'Pesticide', value: 'Pesticide', icon: '🐛' },
  { label: 'Fungicide', value: 'Fungicide', icon: '🍄' },
  { label: 'Equipment', value: 'Equipment', icon: '🚜' },
];

const SORT_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Best Rated', value: 'rating' },
  { label: 'Name A–Z', value: 'name' },
];

// Removed deterministic UI hacks

// ─── Main Component ─────────────────────────────────────────────────────────

const Marketplace = () => {
  const { t } = useTranslation();
  

  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'supplies');
  const [supplies, setSupplies] = useState([]);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('default');
  const [wishlist, setWishlist] = useState(() => JSON.parse(localStorage.getItem('agrivision_wishlist') || '[]'));
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);
  const [listingForm, setListingForm] = useState({ crop_name: '', quantity_tons: '', asking_price_per_ton: '', location: '' });
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [showBidModal, setShowBidModal] = useState(false);
  const [activeListingId, setActiveListingId] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [activeModalTab, setActiveModalTab] = useState('overview');
  const [purchaseMode, setPurchaseMode] = useState('onetime');
  const user = useSelector((state) => state.auth.user);
  const [wholesaleView, setWholesaleView] = useState('market');
  const [activeBids, setActiveBids] = useState([]);
  const [showBidsModal, setShowBidsModal] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => { fetchData(); }, [activeTab]);

  useEffect(() => {
    if (selectedProduct || showListingModal || showBidModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedProduct, showListingModal, showBidModal]);

  const fetchData = async () => {
    

    setLoading(true);
    try {
      if (activeTab === 'supplies') {
        const res = await api.get('/marketplace/supplies');
        setSupplies(res.data);
      } else if (activeTab === 'wholesale') {
        const res = await api.get('/marketplace/listings');
        setListings(res.data);
      } else if (activeTab === 'orders') {
        const [ordersRes, suppliesRes] = await Promise.all([
          api.get('/payments/orders'),
          supplies.length === 0 ? api.get('/marketplace/supplies') : Promise.resolve({ data: supplies })
        ]);
        setOrders(ordersRes.data);
        if (supplies.length === 0) setSupplies(suppliesRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = (id) => {
    

    const next = wishlist.includes(id) ? wishlist.filter(w => w !== id) : [...wishlist, id];
    setWishlist(next);
    localStorage.setItem('agrivision_wishlist', JSON.stringify(next));
    toast.info(wishlist.includes(id) ? 'Removed from wishlist' : '❤️ Added to wishlist!');
  };

  const handleAddToCart = (item, quantity = 1) => {
    

    dispatch(addItem({ ...item, quantity }));
    dispatch(openCart());
    toast.success(`${item.name} added to cart!`);
    setSelectedProduct(null);
  };

  const fetchReviews = async (productId) => {
    

    try {
      const res = await api.get(`/marketplace/products/${productId}/reviews`);
      setReviews(res.data);
    } catch { toast.error("Failed to fetch reviews"); }
  };

  const handleOpenProduct = (item) => {
    

    setSelectedProduct(item);
    setQty(1);
    setActiveModalTab('overview');
    setPurchaseMode('onetime');
    fetchReviews(item.id);
  };

  const submitReview = async (e) => {
    

    e.preventDefault();
    try {
      const res = await api.post(`/marketplace/products/${selectedProduct.id}/reviews`, newReview);
      toast.success("Review submitted!");
      setNewReview({ rating: 5, comment: '' });
      setReviews(prev => [res.data, ...prev]);
      
      const updatedProduct = {
        ...selectedProduct,
        review_count: (selectedProduct.review_count || 0) + 1,
        average_rating: selectedProduct.average_rating 
          ? ((selectedProduct.average_rating * selectedProduct.review_count) + res.data.rating) / ((selectedProduct.review_count || 0) + 1)
          : res.data.rating
      };
      setSelectedProduct(updatedProduct);
      setSupplies(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    } catch { toast.error("Failed to submit review"); }
  };

  const applyCoupon = () => {
    

    const valid = ['AGRI10', 'KISAN20', 'FIRST15'];
    if (valid.includes(couponCode.toUpperCase())) {
      setCouponApplied(true);
      toast.success(`Coupon applied! ${couponCode.toUpperCase()}`);
    } else {
      toast.error('Invalid coupon code');
    }
  };

  // Filtered + sorted supplies
  const filtered = useMemo(() => {
    let list = [...supplies];
    if (category !== 'all') list = list.filter(p => p.category === category);
    if (search) list = list.filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    );
    switch (sort) {
      case 'price_asc': list.sort((a, b) => a.price - b.price); break;
      case 'price_desc': list.sort((a, b) => b.price - a.price); break;
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'rating': list.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)); break;
    }
    return list;
  }, [supplies, category, search, sort]);

  const handleCreateListing = async (e) => {
    

    e.preventDefault();
    try {
      const res = await api.post('/marketplace/listings', {
        ...listingForm,
        quantity_tons: parseFloat(listingForm.quantity_tons),
        asking_price_per_ton: parseFloat(listingForm.asking_price_per_ton)
      });
      setShowListingModal(false);
      setListings(prev => [res.data, ...prev]);
      toast.success('Harvest listed for sale!');
    } catch { toast.error('Failed to create listing'); }
  };

  const handleBid = async (e) => {
    

    e.preventDefault();
    try {
      await api.post('/marketplace/bids', { listing_id: activeListingId, bid_amount_per_ton: parseFloat(bidAmount) });
      toast.success('Bid placed successfully!');
      setShowBidModal(false);
      setBidAmount('');
    } catch { toast.error('Failed to place bid'); }
  };

  const fetchBids = async (listingId) => {
    

    setActiveListingId(listingId);
    try {
      const res = await api.get(`/marketplace/listings/${listingId}/bids`);
      setActiveBids(res.data);
      setShowBidsModal(true);
    } catch { toast.error("Failed to load bids"); }
  };

  const handleAcceptBid = async (bidId) => {
    

    try {
      await api.post(`/marketplace/bids/${bidId}/accept`);
      toast.success("Bid accepted successfully!");
      setShowBidsModal(false);
      setListings(prev => prev.map(l => l.id === activeListingId ? { ...l, status: 'Sold' } : l));
    } catch { toast.error("Failed to accept bid"); }
  };

  return (
    <div className="max-w-7xl mx-auto py-8">

      {/* ─── Banner ─── */}
      <div className="relative bg-gradient-to-br from-green-700 via-emerald-700 to-teal-800 rounded-3xl p-8 mb-8 overflow-hidden text-white shadow-2xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold mb-1">{t("dr_agri_marketplace")}</h1>
            <p className="text-green-100">{t("buy_certified_agri_s")}</p>
            <div className="flex gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full"><Truck size={14} />{t("free_delivery_over__")}</span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full"><ShieldCheck size={14} />{t("certified_products")}</span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full"><Tag size={14} />{t("use_code_agri10")}</span>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex bg-white/10 rounded-2xl p-1 gap-1 backdrop-blur-sm">
            <button onClick={() => setActiveTab('supplies')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${activeTab === 'supplies' ? 'bg-white text-green-700 shadow' : 'text-white/80 hover:text-white'}`}>
              <ShoppingCart size={16} />{t("buy_supplies")}</button>
            <button onClick={() => setActiveTab('wholesale')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${activeTab === 'wholesale' ? 'bg-white text-blue-700 shadow' : 'text-white/80 hover:text-white'}`}>
              <Handshake size={16} />{t("sell_wholesale")}</button>
            <button onClick={() => setActiveTab('orders')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 ${activeTab === 'orders' ? 'bg-white text-gray-900 shadow' : 'text-white/80 hover:text-white'}`}>
              <ClipboardList size={16} />{t("my_orders")}</button>
          </div>
        </div>
      </div>

      {/* ─── Supplies Tab ─── */}
      {activeTab === 'supplies' && (
        <div>
          {/* Sponsored Agricultural Innovations Banner */}
          <SponsoredAds placement="marketplace" layout="banner" className="mb-6" />

          {/* Search + Sort bar */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products, chemicals, seeds..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Coupon */}
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                placeholder="Coupon code"
                className={`px-4 py-3 border rounded-xl text-sm w-36 outline-none focus:ring-2 focus:ring-green-500 ${couponApplied ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
              />
              <button
                onClick={applyCoupon}
                className={`px-4 py-3 rounded-xl text-sm font-bold transition ${couponApplied ? 'bg-green-100 text-green-700' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
              >
                {couponApplied ? <CheckCircle size={16} /> : 'Apply'}
              </button>
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="appearance-none pl-4 pr-10 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-green-500 outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition border ${
                  category === cat.value
                    ? 'bg-green-600 text-white border-green-600 shadow'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-green-400'
                }`}
              >
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{t("showing")}<strong>{filtered.length}</strong>{t("products")}{category !== 'all' && <>{t("in")}<strong>{category}</strong></>}
              {search && <>{t("for__")}<strong>{search}</strong>"</>}
            </p>
            <p className="text-sm text-gray-400">{wishlist.length}{t("items_in_wishlist___")}</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-gray-100">
                  <div className="bg-gray-200 h-40 rounded-xl mb-3" />
                  <div className="h-3 bg-gray-200 rounded mb-2 w-2/3" />
                  <div className="h-4 bg-gray-200 rounded mb-3" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">{t("no_products_found")}</h3>
              <p className="text-gray-400">{t("try_a_different_sear")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {filtered.map(item => {
                const stars = item.average_rating || 0;
                const reviewsCount = item.review_count || 0;
                const discount = item.discount_percentage || 0;
                const originalPrice = discount > 0 ? (item.price / (1 - discount / 100)).toFixed(2) : null;
                const inWishlist = wishlist.includes(item.id);

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group cursor-pointer"
                    onClick={() => handleOpenProduct(item)}
                  >
                    {/* Image */}
                    <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 h-40 flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      ) : (
                        <span className="text-5xl">{CATEGORIES.find(c => c.value === item.category)?.icon || '📦'}</span>
                      )}
                      {/* Discount Badge */}
                      {discount > 0 && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-lg">
                          -{discount}%
                        </span>
                      )}
                      {/* Wishlist */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleWishlist(item.id); }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full shadow transition ${inWishlist ? 'bg-red-100 text-red-500' : 'bg-white/80 text-gray-400 hover:text-red-400'}`}
                      >
                        <Heart size={14} fill={inWishlist ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="p-4 flex flex-col flex-1">
                      <span className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">{item.category}</span>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">{item.name}</h3>

                      {/* Stars */}
                      <div className="flex items-center gap-1 mb-2">
                        <div className="flex">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={11} className={s <= Math.round(stars) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">({reviewsCount})</span>
                      </div>

                      <div className="mt-auto">
                        <div className="flex items-end gap-2 mb-3">
                          <span className="font-extrabold text-lg text-gray-900">₹{item.price.toFixed(2)}</span>
                          {originalPrice && <span className="text-xs text-gray-400 line-through">₹{originalPrice}</span>}
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.stock_quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.stock_quantity > 0 ? `${item.stock_quantity} in stock` : 'Out of stock'}
                          </span>
                        </div>
                        <button
                          disabled={item.stock_quantity === 0}
                          onClick={e => { e.stopPropagation(); handleAddToCart(item); }}
                          className={`w-full py-2 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm ${item.stock_quantity > 0 ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                          <ShoppingCart size={14} /> {item.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Wholesale Tab ─── */}
      {activeTab === 'wholesale' && (
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t("wholesale_harvest_ma")}</h2>
              <p className="text-sm text-gray-500">{t("connect_directly_wit")}</p>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-gray-100 p-1 rounded-xl flex shrink-0">
                <button onClick={() => setWholesaleView('market')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${wholesaleView === 'market' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{t("market")}</button>
                <button onClick={() => setWholesaleView('mine')} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${wholesaleView === 'mine' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{t("my_harvests")}</button>
              </div>
              <button onClick={() => setShowListingModal(true)}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-sm whitespace-nowrap">
                <Plus size={18} />{t("post_harvest")}</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="p-4 font-semibold">{t("crop")}</th>
                  <th className="p-4 font-semibold">{t("location")}</th>
                  <th className="p-4 font-semibold">{t("quantity")}</th>
                  <th className="p-4 font-semibold">{t("asking_price")}</th>
                  <th className="p-4 font-semibold">{t("status")}</th>
                  <th className="p-4 font-semibold text-right">{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const displayListings = wholesaleView === 'mine' 
                    ? listings.filter(l => l.farmer_id === user?.id)
                    : listings.filter(l => l.farmer_id !== user?.id && l.status === 'Active');
                    
                  if (displayListings.length === 0) {
                    return <tr><td colSpan="6" className="p-12 text-center text-gray-400">{t("no_listings_found_in")}</td></tr>;
                  }
                  
                  return displayListings.map(list => (
                    <tr key={list._id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-bold text-sm">{list.crop_name?.[0]}</div>
                          <span className="font-bold text-gray-900">{list.crop_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 text-sm">{list.location}</td>
                      <td className="p-4"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">{list.quantity_tons}{t("tons")}</span></td>
                      <td className="p-4 font-bold text-green-700">₹{list.asking_price_per_ton?.toLocaleString()}{t("__ton")}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${list.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{list.status}</span>
                      </td>
                      <td className="p-4 text-right">
                        {wholesaleView === 'mine' ? (
                          <button onClick={() => fetchBids(list._id)}
                            className="bg-gray-100 text-gray-900 border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition shadow-sm">{t("view_bids")}</button>
                        ) : (
                          <button onClick={() => { setActiveListingId(list._id); setShowBidModal(true); }}
                            className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-700 transition shadow-sm">{t("place_bid")}</button>
                        )}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── My Orders Tab ─── */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="text-gray-600" />{t("order_history")}</h2>
            <p className="text-sm text-gray-500 mt-1">{t("track_your_pending_d")}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">{t("no_orders_found")}</h3>
              <p className="text-gray-400">{t("you_haven_t_placed_a")}</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {orders.map(order => (
                <div key={order.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t("order_reference")}</span>
                        <h3 className="text-lg font-bold text-gray-900">{order.order_ref}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t("order_date")}</span>
                        <p className="text-sm font-semibold text-gray-700">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 mb-4">
                      {order.items.map((item, idx) => {
                        const product = supplies.find(s => s.id === item.id) || item;
                        return (
                          <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                                {product.image_url ? (
                                  <img src={product.image_url} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={24} className="text-gray-300" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 line-clamp-1 text-sm md:text-base">{item.name}</h4>
                                <p className="text-sm text-gray-500 font-medium">{t("qty_")}{item.quantity} × ₹{item.price.toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="font-bold text-gray-900 text-lg">₹{(item.price * item.quantity).toFixed(2)}</span>
                              <button 
                                onClick={() => handleAddToCart(product, 1)}
                                className="hidden md:flex bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 px-4 py-2 rounded-lg text-sm font-bold items-center gap-2 transition"
                              >
                                <ShoppingCart size={14} />{t("buy_again")}</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="w-full md:w-64 flex flex-col justify-between bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t("total_amount")}</span>
                      <p className="text-2xl font-black text-gray-900 mb-4">₹{order.total_amount?.toFixed(2)}</p>
                      
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">{t("status")}</span>
                      <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase mb-6">
                        <CheckCircle size={14} /> {order.status}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Link to={`/tracking/${order.order_ref}`} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/20">
                        <Navigation size={18} />{t("track_package")}</Link>
                      <button 
                        onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'https://dr-agri-ai.onrender.com/api/v1'}/invoices/download/${order.order_ref}`, '_blank')}
                        className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-sm"
                      >
                        <FileText size={18} />{t("download_invoice")}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Product Detail Modal ─── */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-md" onClick={() => setSelectedProduct(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl h-[90vh] md:h-[85vh] flex flex-col md:flex-row overflow-hidden border border-white/20"
            >
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="absolute top-6 right-6 z-50 w-11 h-11 flex items-center justify-center bg-white/90 backdrop-blur-xl rounded-full shadow-[0_8px_16px_-4px_rgba(0,0,0,0.1)] hover:bg-white transition-all hover:scale-105 active:scale-95 text-gray-700 hover:text-gray-900 border border-gray-100 focus:outline-none focus:ring-4 focus:ring-green-500/20"
              >
                <X size={20} strokeWidth={2.5} />
              </button>

              {/* Left Side: Product Image & Gallery */}
              <div className="w-full md:w-[45%] bg-gray-50 flex flex-col p-4 sm:p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 shrink-0">
                <div className="flex-1 flex items-center justify-center relative group overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-gray-100 min-h-[180px] sm:min-h-[220px] md:min-h-[300px]">
                  {selectedProduct.image_url ? (
                    <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-auto max-h-48 md:max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700 ease-in-out" />
                  ) : (
                    <span className="text-6xl sm:text-8xl">{CATEGORIES.find(c => c.value === selectedProduct.category)?.icon || '📦'}</span>
                  )}
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-gray-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 border border-gray-100">
                    <Search size={12} />{t("hover_to_zoom")}</div>
                </div>

                {selectedProduct.image_url && (
                  <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                    <button className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl border-2 border-green-500 p-1 bg-white shadow-sm hover:scale-105 transition"><img src={selectedProduct.image_url} className="w-full h-full object-cover rounded-lg" /></button>
                    <button className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl border border-gray-200 p-1 bg-white hover:border-gray-300 opacity-60 hover:opacity-100 hover:scale-105 transition"><img src={selectedProduct.image_url} className="w-full h-full object-cover rounded-lg grayscale" /></button>
                  </div>
                )}
              </div>

              {/* Right Side: Product Details */}
              <div className="relative w-full md:w-[55%] bg-white h-full flex flex-col min-w-0">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-[180px] sm:pb-[200px] custom-scrollbar">
                  
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 px-3 py-1.5 rounded-full mb-4">
                    <span className="text-emerald-600">✨</span>
                    <span className="text-xs font-bold text-emerald-800">{t("ai_recommended__high")}</span>
                  </div>

                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-extrabold text-green-600 uppercase tracking-widest">{selectedProduct.category}</span>
                      <h2 className="text-3xl font-extrabold text-gray-900 mt-1 tracking-tight">{selectedProduct.name}</h2>
                    </div>
                    <button onClick={() => toggleWishlist(selectedProduct.id)} className={`p-2.5 rounded-full transition ${wishlist.includes(selectedProduct.id) ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-400'}`}>
                      <Heart size={22} fill={wishlist.includes(selectedProduct.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center bg-amber-50 px-2 py-1 rounded-lg">
                      <Star size={14} className="text-amber-500 fill-amber-500 mr-1" />
                      <span className="text-sm font-bold text-amber-700">{(selectedProduct.average_rating || 0).toFixed(1)}</span>
                    </div>
                    <button onClick={() => setActiveModalTab('reviews')} className="text-sm font-medium text-gray-500 hover:text-green-600 transition underline decoration-gray-300 underline-offset-4 cursor-pointer">
                      {selectedProduct.review_count || 0}{t("verified_reviews")}</button>
                  </div>

                  {/* ─── Premium Tabs ─── */}
                  <div className="flex gap-6 border-b border-gray-100 mb-6">
                    {['overview', 'ai_analysis', 'specs', 'reviews'].map(tab => (
                      <button 
                        key={tab} 
                        onClick={() => setActiveModalTab(tab)}
                        className={`pb-3 text-sm font-bold transition-all relative ${activeModalTab === tab ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {tab === 'ai_analysis' ? '✨ AI Analysis' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {activeModalTab === tab && (
                          <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 rounded-t-full" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* ─── Tab Contents ─── */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeModalTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* OVERVIEW TAB */}
                      {activeModalTab === 'overview' && (
                        <div>
                          <p className="text-gray-600 text-[15px] leading-relaxed mb-8">{selectedProduct.description || 'Premium quality agricultural product sourced and certified by Dr Agri.'}</p>

                          <div className="grid grid-cols-2 gap-4 mb-8">
                            {[
                              { icon: <ShieldCheck size={20} className="text-blue-500"/>, title: 'Certified', sub: selectedProduct.is_organic ? '100% Organic' : 'Quality Checked', bg: 'bg-blue-50' },
                              { icon: <Truck size={20} className="text-purple-500"/>, title: 'Fast Delivery', sub: '2-4 business days', bg: 'bg-purple-50' },
                              { icon: <Leaf size={20} className="text-green-500"/>, title: 'Eco-Friendly', sub: 'Sustainable packing', bg: 'bg-green-50' },
                              { icon: <CheckCircle size={20} className="text-amber-500"/>, title: 'In Stock', sub: 'Ready to ship', bg: 'bg-amber-50' },
                            ].map((t, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-white shadow-sm cursor-default">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.bg}`}>{t.icon}</div>
                                <div>
                                  <p className="text-xs font-bold text-gray-900">{t.title}</p>
                                  <p className="text-[11px] font-medium text-gray-500">{t.sub}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                              <span className="font-bold text-sm text-gray-900">{t("select_quantity")}</span>
                              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                                {selectedProduct.stock_quantity > 0 ? `${selectedProduct.stock_quantity} Available` : 'Out of Stock'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center transition">−</button>
                                <span className="w-12 text-center font-bold text-gray-900 text-lg">{qty}</span>
                                <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center transition">+</button>
                              </div>
                              
                              {['Seeds', 'Fertilizer', 'Organic Fertilizer', 'Pesticide'].includes(selectedProduct.category) && (
                                <div className="flex-1 bg-white border border-blue-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">📐</div>
                                  <div>
                                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{t("coverage_area")}</p>
                                    <p className="text-sm font-extrabold text-blue-900">{t("approx_")}{(qty * 0.5).toFixed(1)}{t("acres")}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AI ANALYSIS TAB */}
                      {activeModalTab === 'ai_analysis' && (
                        <div className="space-y-6">
                          <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100">
                            <h3 className="font-bold text-emerald-900 mb-2 flex items-center gap-2"><Zap size={18} className="text-emerald-500"/>{t("dr_agri_core_engine")}</h3>
                            <p className="text-sm text-emerald-800 leading-relaxed mb-6">{t("based_on_recent_sate")}</p>
                            
                            <div className="space-y-5">
                              <div>
                                <div className="flex justify-between text-sm font-bold mb-1"><span className="text-gray-700">{t("soil_compatibility")}</span><span className="text-emerald-600">96%</span></div>
                                <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: '96%' }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-emerald-500 rounded-full"/></div>
                              </div>
                              <div>
                                <div className="flex justify-between text-sm font-bold mb-1"><span className="text-gray-700">{t("weather_resilience")}</span><span className="text-blue-600">{t("optimal")}</span></div>
                                <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: '88%' }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-blue-500 rounded-full"/></div>
                              </div>
                              <div>
                                <div className="flex justify-between text-sm font-bold mb-1"><span className="text-gray-700">{t("expected_yield_impac")}</span><span className="text-amber-600">+14%</span></div>
                                <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: '75%' }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full bg-amber-500 rounded-full"/></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SPECS TAB */}
                      {activeModalTab === 'specs' && (
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            { label: 'Category', value: selectedProduct.category },
                            { label: 'Dosage per Acre', value: selectedProduct.dosage_per_acre || 'Standard Application' },
                            { label: 'Organic Certification', value: selectedProduct.is_organic ? 'Certified Organic' : 'Non-Organic' },
                            { label: 'SKU', value: `AGRI-${selectedProduct.id?.substring(0,6).toUpperCase() || 'X991'}` },
                            { label: 'Manufacturer', value: 'Dr Agri Partner Network' },
                            { label: 'Shelf Life', value: '24 Months from manufacturing' }
                          ].map((spec, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-gray-100 last:border-0">
                              <span className="text-sm text-gray-500">{spec.label}</span>
                              <span className="text-sm font-bold text-gray-900">{spec.value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* REVIEWS TAB */}
                      {activeModalTab === 'reviews' && (
                        <div>
                          <form onSubmit={submitReview} className="bg-white border border-gray-200 p-5 rounded-2xl mb-8 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <span className="font-bold text-sm text-gray-900">{t("rate_this_product")}</span>
                              <div className="flex gap-1">
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} size={24} onClick={() => setNewReview({ ...newReview, rating: s })} className={`cursor-pointer transition-transform hover:scale-110 ${s <= newReview.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                                ))}
                              </div>
                            </div>
                            <textarea required value={newReview.comment} onChange={e => setNewReview({ ...newReview, comment: e.target.value })} placeholder="What did you like or dislike?" className="w-full text-sm border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-green-500 mb-3 border bg-gray-50 focus:bg-white transition-colors" rows="3"></textarea>
                            <button type="submit" className="bg-gray-900 text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-gray-800 transition float-right">{t("post_review")}</button>
                            <div className="clear-both"></div>
                          </form>

                          <div className="space-y-5">
                            {reviews.length === 0 ? (
                              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-2xl">{t("be_the_first_to_revi")}</div>
                            ) : reviews.map((r, i) => (
                              <div key={i} className="border-b border-gray-100 pb-5 last:border-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">{r.user_name.charAt(0)}</div>
                                    <span className="font-bold text-sm text-gray-900">{r.user_name}</span>
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full"><CheckCircle size={10}/>{t("verified")}</span>
                                  </div>
                                  <div className="flex">
                                    {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />)}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 pl-10">{r.comment}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Sticky Bottom Premium Checkout Bar */}
                <div className="absolute bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-100 p-5 md:p-6 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.15)] z-10 flex flex-col gap-4">
                  
                  {/* Dynamic Pricing Toggles */}
                  <div className="flex items-center bg-gray-100 p-1 rounded-xl w-full">
                    <button onClick={() => setPurchaseMode('onetime')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${purchaseMode === 'onetime' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{t("one_time_purchase")}</button>
                    <button onClick={() => setPurchaseMode('subscribe')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${purchaseMode === 'subscribe' ? 'bg-green-100 text-green-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      <Leaf size={12} className={purchaseMode === 'subscribe' ? 'text-green-600' : 'text-gray-400'}/>{t("subscribe___save_10_")}</button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-3xl font-black text-gray-900 tracking-tight">
                          ₹{(selectedProduct.price * qty * (purchaseMode === 'subscribe' ? 0.9 : 1)).toFixed(2)}
                        </p>
                        {purchaseMode === 'subscribe' ? (
                          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">{t("10__sub_savings")}</span>
                        ) : selectedProduct.discount_percentage > 0 && (
                          <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">{selectedProduct.discount_percentage}{t("__off")}</span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-0.5">{t("total_price")}{purchaseMode === 'subscribe' && '(Auto-Renews)'}</p>
                    </div>
                    
                    <button
                      disabled={selectedProduct.stock_quantity === 0}
                      onClick={() => handleAddToCart(selectedProduct, qty)}
                      className="flex-none px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold text-base hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-gray-900/20 flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      <ShoppingCart size={20} />
                      {selectedProduct.stock_quantity > 0 ? `Add to Cart` : 'Out of Stock'}
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Wholesale Bid Modal ─── */}
      <AnimatePresence>
        {showBidModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBidModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
              <button onClick={() => setShowBidModal(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
              <Handshake className="text-blue-600 w-16 h-16 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-gray-900">{t("place_a_bid")}</h2>
              <p className="text-sm text-gray-500 mb-6">{t("enter_your_offering_")}</p>
              <form onSubmit={handleBid}>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  autoFocus
                  placeholder="e.g. 21500" 
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-center text-2xl font-black text-gray-900 focus:border-blue-500 outline-none mb-6"
                  value={bidAmount} 
                  onChange={e => setBidAmount(e.target.value)} 
                />
                <button type="submit" className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 text-lg">{t("submit_bid")}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── View Bids Modal ─── */}
      <AnimatePresence>
        {showBidsModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBidsModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 max-h-[80vh] flex flex-col">
              <button onClick={() => setShowBidsModal(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">{t("bids_received")}</h2>
              
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                {activeBids.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">{t("no_bids_placed_on_th")}</div>
                ) : activeBids.map(bid => (
                  <div key={bid._id} className="bg-gray-50 border border-gray-100 p-5 rounded-2xl flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t("bid_amount")}</span>
                      <p className="text-2xl font-black text-green-600 mb-1">₹{bid.bid_amount_per_ton.toLocaleString()} <span className="text-sm font-medium text-gray-500">{t("__ton")}</span></p>
                      <p className="text-sm font-bold text-gray-700">{t("status_")}<span className={bid.status === 'Pending' ? 'text-yellow-600' : bid.status === 'Accepted' ? 'text-green-600' : 'text-red-600'}>{bid.status}</span></p>
                    </div>
                    {bid.status === 'Pending' && (
                      <button onClick={() => handleAcceptBid(bid._id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-md hover:shadow-lg">{t("accept_bid")}</button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Post Harvest Modal ─── */}
      <AnimatePresence>
        {showListingModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowListingModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
              <button onClick={() => setShowListingModal(false)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="text-blue-600" />{t("post_harvest_for_sal")}</h2>
              <form onSubmit={handleCreateListing} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t("crop_type")}</label>
                  <input type="text" required placeholder="e.g. Tomato, Wheat" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={listingForm.crop_name} onChange={e => setListingForm({ ...listingForm, crop_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("quantity__tons_")}</label>
                    <input type="number" required min="1" step="0.5" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={listingForm.quantity_tons} onChange={e => setListingForm({ ...listingForm, quantity_tons: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("price___ton____")}</label>
                    <input type="number" required min="100" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={listingForm.asking_price_per_ton} onChange={e => setListingForm({ ...listingForm, asking_price_per_ton: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t("farm_location")}</label>
                  <input type="text" required placeholder="e.g. Punjab, India" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={listingForm.location} onChange={e => setListingForm({ ...listingForm, location: e.target.value })} />
                </div>
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setShowListingModal(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition">{t("cancel")}</button>
                  <button type="submit"
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">{t("list_to_buyers")}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Marketplace;
