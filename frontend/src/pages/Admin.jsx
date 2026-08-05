import { useState, useEffect } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, ShieldCheck, Activity, Server, AlertCircle, 
  Package, Plus, Edit3, Trash2, X, Image as ImageIcon, Building, UserPlus,
  FileText, ClipboardList
} from 'lucide-react';
import { toast } from 'react-toastify';

import { useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';

const CATEGORIES = [
  'Seeds', 'Nursery', 'Organic Fertilizer', 'Fertilizer', 
  'Bio Fertilizer', 'Pesticide', 'Fungicide', 'Equipment'
];

const Admin = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'products', 'organizations'
  
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Product Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'Seeds', price: '', description: '', 
    dosage_per_acre: '', is_organic: false, image_url: '',
    stock_quantity: 100, discount_percentage: 0
  });

  // Role Modal State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleUser, setRoleUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('FARMER');

  // Org Modal State
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [orgForm, setOrgForm] = useState({ name: '', org_type: 'Co-op' });

  useEffect(() => {
    fetchData();
    // Clear selections when switching tabs
    setSelectedProducts([]);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'users') {
        const res = await api.get('/admin/users');
        setUsers(res.data);
      } else if (activeTab === 'products') {
        // We can reuse the public supply route to list products, 
        // since Admin needs to see what's publicly available.
        const res = await api.get('/marketplace/supplies');
        setProducts(res.data);
      } else if (activeTab === 'organizations') {
        const res = await api.get('/organizations');
        setOrganizations(res.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data. Ensure you have Admin privileges.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setForm({
      name: '', category: 'Seeds', price: '', description: '', 
      dosage_per_acre: '', is_organic: false, image_url: '',
      stock_quantity: 100, discount_percentage: 0
    });
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setForm({
      name: p.name || '',
      category: p.category || 'Seeds',
      price: p.price || '',
      description: p.description || '',
      dosage_per_acre: p.dosage_per_acre || '',
      is_organic: p.is_organic || false,
      image_url: p.image_url || '',
      stock_quantity: p.stock_quantity ?? 100,
      discount_percentage: p.discount_percentage ?? 0
    });
    setShowModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity, 10),
        discount_percentage: parseFloat(form.discount_percentage)
      };

      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct.id}`, payload);
        toast.success('Product updated successfully!');
      } else {
        await api.post('/admin/products', payload);
        toast.success('Product created successfully!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this product?")) return;
    try {
      await api.delete(`/admin/products/${id}`);
      toast.success('Product deleted');
      fetchData();
      setSelectedProducts(prev => prev.filter(pid => pid !== id));
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const toggleProductSelect = (id) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAllProducts = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedProducts.length} products?`)) return;
    try {
      await api.post('/admin/products/bulk', { product_ids: selectedProducts, action: 'delete' });
      toast.success(`Deleted ${selectedProducts.length} products`);
      setSelectedProducts([]);
      fetchData();
    } catch (err) {
      toast.error('Failed to perform bulk delete');
    }
  };

  const handleBulkDiscount = async () => {
    const discountStr = window.prompt("Enter discount percentage (e.g. 15):");
    if (discountStr === null) return;
    const discount = parseFloat(discountStr);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      toast.error("Invalid discount percentage");
      return;
    }
    
    try {
      await api.post('/admin/products/bulk', { 
        product_ids: selectedProducts, 
        action: 'discount',
        discount_percentage: discount
      });
      toast.success(`Applied ${discount}% discount to ${selectedProducts.length} products`);
      setSelectedProducts([]);
      fetchData();
    } catch (err) {
      toast.error('Failed to perform bulk update');
    }
  };

  const openRoleModal = (u) => {
    setRoleUser(u);
    setSelectedRole(u.role || 'FARMER');
    setShowRoleModal(true);
  };

  const submitRoleChange = async (e) => {
    e.preventDefault();
    if (!roleUser) return;
    try {
      await api.put(`/admin/users/${roleUser.id}/role`, { role: selectedRole });
      toast.success(`Role updated to ${selectedRole}`);
      fetchData();
      setShowRoleModal(false);
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const openOrgEditModal = (org) => {
    setEditingOrg(org);
    setOrgForm({ name: org.name || '', org_type: org.org_type || 'Co-op' });
    setShowOrgModal(true);
  };

  const handleSaveOrg = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingOrg) {
        await api.put(`/organizations/${editingOrg.id}`, orgForm);
        toast.success('FPO updated successfully!');
      } else {
        await api.post('/organizations', orgForm);
        toast.success('FPO created successfully!');
      }
      setShowOrgModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save FPO');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrg = async (id) => {
    if (!window.confirm("Are you sure you want to completely delete this FPO? All members will be removed.")) return;
    try {
      await api.delete(`/organizations/${id}`);
      toast.success('FPO deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete FPO');
    }
  };

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* ─── Header ─── */}
      <div className="bg-gradient-to-r from-gray-900 to-indigo-900 rounded-3xl p-8 text-white mb-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 mb-2">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
            Admin Command Center
          </h1>
          <p className="text-indigo-200">System Overview & Inventory Control</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-white/10 rounded-2xl p-1 gap-1 backdrop-blur-md overflow-x-auto">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-indigo-900 shadow' : 'text-white/80 hover:text-white'}`}
          >
            <Users size={16} /> Directory
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'products' ? 'bg-white text-indigo-900 shadow' : 'text-white/80 hover:text-white'}`}
          >
            <Package size={16} /> Products
          </button>
          <button 
            onClick={() => setActiveTab('organizations')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'organizations' ? 'bg-white text-indigo-900 shadow' : 'text-white/80 hover:text-white'}`}
          >
            <Building size={16} /> FPOs
          </button>
          
          {/* External Navigation Links disguised as tabs */}
          <button 
            onClick={() => navigate('/inventory')}
            className="px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap text-white/80 hover:text-white hover:bg-white/10"
          >
            <ClipboardList size={16} /> Inventory Logs
          </button>
          <button 
            onClick={() => navigate('/cms')}
            className="px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap text-white/80 hover:text-white hover:bg-white/10"
          >
            <FileText size={16} /> Content CMS
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-8 flex items-center gap-3">
          <AlertCircle />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* ─── Users Tab ─── */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-indigo-600" /> Registered Users
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Tier</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">Loading directory...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">No users found.</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{u.name}</p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {(u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') ? <ShieldCheck size={12} /> : <Users size={12} />} {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">{u.tier || 'basic'}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => openRoleModal(u)}
                          className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 px-3 py-1.5 rounded-lg"
                        >
                          Change Role
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Products Tab ─── */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package size={20} className="text-indigo-600" /> Product Inventory
            </h2>
            <button onClick={openAddModal} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm">
              <Plus size={16} /> New Product
            </button>
          </div>
          
          {selectedProducts.length > 0 && (
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-1 rounded-md">{selectedProducts.length}</span>
                <span className="text-sm font-semibold text-indigo-900">Products Selected</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleBulkDiscount}
                  className="text-sm font-bold bg-white text-indigo-600 px-3 py-1.5 rounded-lg shadow-sm border border-indigo-200 hover:bg-indigo-100 transition"
                >
                  Apply Bulk Discount
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="text-sm font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-700 transition"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="px-6 py-4 w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={products.length > 0 && selectedProducts.length === products.length}
                      onChange={toggleSelectAllProducts}
                    />
                  </th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Organic</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Loading catalog...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No products in inventory.</td></tr>
                ) : (
                  products.map(p => (
                    <tr key={p.id} className={`transition ${selectedProducts.includes(p.id) ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={selectedProducts.includes(p.id)}
                          onChange={() => toggleProductSelect(p.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400"><ImageIcon size={16} /></div>
                          )}
                          <p className="font-bold text-gray-900">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-semibold">{p.category}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        ₹{p.price.toFixed(2)}
                        {p.discount_percentage > 0 && (
                          <span className="ml-2 text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            -{p.discount_percentage}%
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${p.stock_quantity > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4">{p.is_organic ? '✅' : '❌'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(p)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Edit3 size={16} /></button>
                          <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Organizations Tab ─── */}
      {activeTab === 'organizations' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building size={20} className="text-indigo-600" /> Farmer Producer Organizations
            </h2>
            <button onClick={() => {
              setEditingOrg(null);
              setOrgForm({ name: '', org_type: 'Co-op' });
              setShowOrgModal(true);
            }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm">
              <Plus size={16} /> New FPO
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="px-6 py-4">Organization Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Members</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">Loading organizations...</td></tr>
                ) : organizations.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">No organizations found.</td></tr>
                ) : (
                  organizations.map(org => (
                    <tr key={org.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
                            <Building size={20} />
                          </div>
                          <p className="font-bold text-gray-900">{org.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-semibold">{org.org_type}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">{org.member_count} <span className="text-gray-500 font-normal">users</span></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <button 
                            onClick={() => {
                              const email = window.prompt("Enter the exact email of the user to add to this FPO:");
                              if (!email) return;
                              api.get('/admin/users').then(res => {
                                const userToApp = res.data.find(u => u.email === email);
                                if(!userToApp) {
                                  toast.error("User email not found in directory.");
                                  return;
                                }
                                api.post(`/organizations/${org.id}/members`, { user_ids: [userToApp.id], role: 'worker' })
                                    .then(() => { toast.success("Added Member!"); fetchData(); })
                                    .catch(() => toast.error("Failed to add member"));
                              });
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                          >
                            <UserPlus size={14} /> Add
                          </button>
                          <button onClick={() => openOrgEditModal(org)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Edit FPO">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDeleteOrg(org.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete FPO">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Product Modal ─── */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="text-indigo-600" /> {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Product Name *</label>
                  <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Category *</label>
                    <select required value={form.category} onChange={e => setForm({...form, category: e.target.value})} 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Price (₹) *</label>
                    <input required type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({...form, price: e.target.value})} 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Stock Quantity</label>
                    <input type="number" min="0" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})} 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Discount (%)</label>
                    <input type="number" step="0.1" min="0" max="100" value={form.discount_percentage} onChange={e => setForm({...form, discount_percentage: e.target.value})} 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Description</label>
                  <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Image URL (Optional)</label>
                  <input type="url" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">Dosage per Acre</label>
                    <input type="text" value={form.dosage_per_acre} onChange={e => setForm({...form, dosage_per_acre: e.target.value})} placeholder="e.g. 2 Litres"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="flex items-center justify-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_organic} onChange={e => setForm({...form, is_organic: e.target.checked})} 
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-bold text-gray-700">Is Organic?</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-70">
                    {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Role Modal ─── */}
      <AnimatePresence>
        {showRoleModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRoleModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
              
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="text-indigo-600" /> Change Role
                </h3>
                <p className="text-sm text-gray-500 mt-1">Assigning a new role for <span className="font-bold text-gray-900">{roleUser?.name}</span></p>
              </div>

              <form onSubmit={submitRoleChange} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">Select Role</label>
                  <select 
                    required 
                    value={selectedRole} 
                    onChange={e => setSelectedRole(e.target.value)} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700 cursor-pointer"
                  >
                    <option value="FARMER">🧑‍🌾 Farmer (Default)</option>
                    <option value="AGRONOMY_EXPERT">🔬 Agronomy Expert</option>
                    <option value="DELIVERY_PARTNER">🚚 Delivery Partner</option>
                    <option value="WAREHOUSE_MANAGER">🏭 Warehouse Manager</option>

                    <option value="NURSERY_MANAGER">🌱 Nursery Manager</option>
                    <option value="ADMIN">🛡️ Admin</option>
                    <option value="SUPER_ADMIN">👑 Super Admin</option>
                  </select>
                </div>
                
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setShowRoleModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md">
                    Update Role
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FPO Edit Modal ─── */}
      <AnimatePresence>
        {showOrgModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOrgModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Building className="text-indigo-600" /> {editingOrg ? 'Edit FPO' : 'Create New FPO'}
                </h3>
                <button onClick={() => setShowOrgModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveOrg} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">FPO Name *</label>
                  <input required type="text" value={orgForm.name} onChange={e => setOrgForm({...orgForm, name: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">Organization Type *</label>
                  <select required value={orgForm.org_type} onChange={e => setOrgForm({...orgForm, org_type: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700 cursor-pointer">
                    <option value="Co-op">Co-operative</option>
                    <option value="Farm">Corporate Farm</option>
                    <option value="Govt">Government Body</option>
                    <option value="Nursery">Nursery Group</option>
                    <option value="NGO">Non-Profit / NGO</option>
                  </select>
                </div>
                
                <div className="pt-4 mt-2 border-t border-gray-100 flex gap-3">
                  <button type="button" onClick={() => setShowOrgModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md disabled:opacity-70 flex justify-center items-center gap-2">
                    {saving ? 'Saving...' : editingOrg ? 'Update FPO' : 'Create FPO'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Admin;
