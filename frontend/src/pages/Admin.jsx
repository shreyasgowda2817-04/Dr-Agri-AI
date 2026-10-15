import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, ShieldCheck, Activity, Server, AlertCircle, 
  Package, Plus, Edit3, Trash2, X, Image as ImageIcon, Building, UserPlus,
  FileText, ClipboardList, Megaphone
} from 'lucide-react';
import { toast } from 'react-toastify';
import Inventory from './Inventory';
import CMS from './CMS';
import AdminAdsManagement from '../components/admin/AdminAdsManagement';

import { useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';

const CATEGORIES = [
  'Seeds', 'Nursery', 'Organic Fertilizer', 'Fertilizer', 
  'Bio Fertilizer', 'Pesticide', 'Fungicide', 'Equipment'
];

const Admin = () => {
  const { t } = useTranslation();
  

  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'products', 'organizations'

  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [experts, setExperts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Product Modal State

  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [schemeForm, setSchemeForm] = useState({ title: '', description: '', eligibility: '', apply_link: '' });

  const handleSaveScheme = async (e) => {
    

    e.preventDefault();
    try {
      const res = await api.post('/schemes/', schemeForm);
      setSchemes(prev => [...prev, res.data]);
      setShowSchemeModal(false);
      setSchemeForm({ title: '', description: '', eligibility: '', apply_link: '' });
      toast.success("Scheme saved!");
    } catch (err) {
      alert("Failed to save scheme");
    }
  };

  const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, actionType: null, payload: null, title: '', message: '' });

  const handleGenericConfirm = async () => {
    

    const { actionType, payload } = confirmModalState;
    try {
      if (actionType === 'delete_product') {
        await api.delete(`/admin/products/${payload}`);
        toast.success("Product deleted");
        setProducts(prev => prev.filter(p => p.id !== payload));
        setSelectedProducts(prev => prev.filter(pid => pid !== payload));
      } else if (actionType === 'bulk_delete_products') {
        await api.post('/admin/products/bulk', { product_ids: payload, action: 'delete' });
        toast.success(`Deleted ${payload.length} products`);
        setProducts(prev => prev.filter(p => !payload.includes(p.id)));
        setSelectedProducts([]);
      } else if (actionType === 'delete_org') {
        await api.delete(`/admin/organizations/${payload}`);
        toast.success("Organization deleted");
        setOrganizations(prev => prev.filter(o => o.id !== payload));
      } else if (actionType === 'delete_expert') {
        await api.delete(`/admin/users/${payload}`);
        toast.success("Expert deleted");
        setUsers(prev => prev.filter(u => u.id !== payload));
        setExperts(prev => prev.filter(e => e.id !== payload));
      } else if (actionType === 'delete_scheme') {
        await api.delete(`/schemes/${payload}`);
        toast.success("Scheme deleted");
        setSchemes(prev => prev.filter(s => s.id !== payload));
      }
    } catch (err) {
      toast.error("Action failed");
    } finally {
      setConfirmModalState({ isOpen: false, actionType: null, payload: null, title: '', message: '' });
    }
  };
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'Seeds', price: '', description: '', 
    dosage_per_acre: '', is_organic: false, image_url: '',
    stock_quantity: 100, discount_percentage: 0
  });



  // User Edit Modal State
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', email: '' });

  const openUserEditModal = (u) => {
    

    setEditingUser(u);
    setUserForm({ name: u.name, email: u.email });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    

    e.preventDefault();
    try {
      setSaving(true);
      await api.put(`/admin/users/${editingUser.id}`, userForm);
      toast.success("User updated successfully");
      setShowUserModal(false);
      // Optimistic update instead of full refresh
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, name: userForm.name, email: userForm.email } : u));
    } catch (err) {
      toast.error("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserStatus = async (userId, isActive) => {
    

    try {
      await api.put(`/admin/users/${userId}`, { is_active: !isActive });
      toast.success(isActive ? "User blocked successfully" : "User unblocked successfully");
      // Optimistic update
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !isActive } : u));
    } catch (err) {
      toast.error("Failed to change user status");
    }
  };

  const executeDeleteUser = async () => {
    

    if (!deleteConfirmId) return;
    try {
      await api.delete(`/admin/users/${deleteConfirmId}`);
      toast.success("User deleted forever");
      // Optimistic update
      setUsers(users.filter(u => u.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  // Role Modal State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleUser, setRoleUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('FARMER');

  // Org Modal State
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  const [orgForm, setOrgForm] = useState({ name: '', org_type: 'Co-op' });

  // Expert Modal State
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [editingExpert, setEditingExpert] = useState(null);
  const [expertForm, setExpertForm] = useState({ name: '', email: '', password: '', role: 'AGRONOMY_EXPERT', languages: 'English, Local' });

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
      } else if (activeTab === 'schemes') {
        const res = await api.get('/schemes/');
        setSchemes(res.data);
      } else if (activeTab === 'experts') {
        const res = await api.get('/consultations/experts');
        setExperts(res.data);
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
        const res = await api.put(`/admin/products/${editingProduct.id}`, payload);
        toast.success('Product updated successfully!');
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? res.data : p));
      } else {
        const res = await api.post('/admin/products', payload);
        toast.success('Product created successfully!');
        setProducts(prev => [...prev, res.data]);
      }
      setShowModal(false);
    } catch (err) {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (id) => {
    

    setConfirmModalState({ 
      isOpen: true, actionType: 'delete_product', payload: id, 
      title: 'Delete Product', message: 'Are you sure you want to permanently delete this product?' 
    });
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

  const handleBulkDelete = () => {
    

    setConfirmModalState({ 
      isOpen: true, actionType: 'bulk_delete_products', payload: selectedProducts, 
      title: 'Bulk Delete Products', message: `Are you sure you want to permanently delete ${selectedProducts.length} products?` 
    });
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
      setProducts(prev => prev.map(p => {
        if (selectedProducts.includes(p.id)) {
          return { ...p, price: p.price * (1 - discount / 100) };
        }
        return p;
      }));
      setSelectedProducts([]);
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
      setUsers(prev => prev.map(u => u.id === roleUser.id ? { ...u, role: selectedRole } : u));
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
        const res = await api.put(`/organizations/${editingOrg.id}`, orgForm);
        toast.success('FPO updated successfully!');
        setOrganizations(prev => prev.map(o => o.id === editingOrg.id ? res.data : o));
      } else {
        const res = await api.post('/organizations', orgForm);
        toast.success('FPO created successfully!');
        setOrganizations(prev => [...prev, res.data]);
      }
      setShowOrgModal(false);
    } catch (err) {
      toast.error('Failed to save FPO');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrg = (id) => {
    

    setConfirmModalState({ 
      isOpen: true, actionType: 'delete_org', payload: id, 
      title: 'Delete Organization', message: 'Are you sure you want to completely delete this FPO? All members will be removed.' 
    });
  };

  const handleSaveExpert = async (e) => {
    

    e.preventDefault();
    setSaving(true);
    try {
      if (editingExpert) {
        // Find email by filtering the raw experts/users list if needed, or just update name
        // Our update endpoint takes name, email, and languages
        const res = await api.put(`/admin/users/${editingExpert.id}`, { 
          name: expertForm.name, 
          email: expertForm.email,
          languages: expertForm.languages 
        });
        toast.success('Expert profile updated successfully!');
        setExperts(prev => prev.map(e => e.id === editingExpert.id ? res.data : e));
        setUsers(prev => prev.map(u => u.id === editingExpert.id ? res.data : u));
      } else {
        const res = await api.post('/auth/register', expertForm);
        toast.success('Expert account created successfully!');
        setExperts(prev => [...prev, res.data]);
        setUsers(prev => [...prev, res.data]);
      }
      setShowExpertModal(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save expert');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpert = (id) => {
    

    setConfirmModalState({ 
      isOpen: true, actionType: 'delete_expert', payload: id, 
      title: 'Delete Expert', message: "Are you sure you want to completely delete this expert's account?" 
    });
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
            <ShieldCheck className="w-8 h-8 text-indigo-400" />{t("admin_command_center")}</h1>
          <p className="text-indigo-200">{t("system_overview___in")}</p>
        </div>
        
        {/* Tabs */}
        <div className="flex flex-wrap bg-white/10 rounded-2xl p-1 gap-1 backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-indigo-900 shadow' : 'text-white/80 hover:text-white'}`}
          >
            <Users size={16} />{t("users")}</button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'products' ? 'bg-white text-indigo-900 shadow' : 'text-white/80 hover:text-white'}`}
          >
            <Package size={16} />{t("products")}</button>

          <button 
            onClick={() => setActiveTab('schemes')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'schemes' ? 'bg-white text-indigo-900 shadow' : 'text-white/80 hover:text-white'}`}
          >
            <ShieldCheck size={16} />{t("govt_schemes")}</button>
          <button 
            onClick={() => setActiveTab('organizations')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'organizations' ? 'bg-white text-indigo-900 shadow' : 'text-white/80 hover:text-white'}`}
          >
            <Building size={16} />{t("fpos")}</button>
          <button 
            onClick={() => setActiveTab('experts')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'experts' ? 'bg-white text-indigo-900 shadow' : 'text-white/80 hover:text-white'}`}
          >
            <Activity size={16} />{t("experts___consults")}</button>
          
          {/* External Navigation Links disguised as tabs */}
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'inventory' ? 'bg-white text-indigo-900 shadow' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
          >
            <ClipboardList size={16} />{t("inventory_logs")}</button>
          <button 
            onClick={() => setActiveTab('cms')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'cms' ? 'bg-white text-indigo-900 shadow' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
          >
            <FileText size={16} />{t("content_cms")}</button>
          <button 
            onClick={() => setActiveTab('ads')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'ads' ? 'bg-white text-indigo-900 shadow' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
          >
            <Megaphone size={16} /> Sponsored Ads</button>
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
              <Users size={20} className="text-indigo-600" />{t("registered_users")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="px-6 py-4">{t("user")}</th>
                  <th className="px-6 py-4">{t("role")}</th>
                  <th className="px-6 py-4">{t("tier")}</th>
                  <th className="px-6 py-4 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">{t("loading_directory___")}</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">{t("no_users_found_")}</td></tr>
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
                        <div className="flex justify-end gap-2 items-center">
                          <button 
                            onClick={() => openRoleModal(u)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 px-2 py-1 rounded-lg"
                          >{t("role")}</button>
                          <button 
                            onClick={() => openUserEditModal(u)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Edit Profile"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                            className={`p-1.5 rounded-lg transition ${u.is_active === false ? 'text-green-600 hover:bg-green-50' : 'text-amber-500 hover:bg-amber-50'}`} 
                            title={u.is_active === false ? 'Unblock User' : 'Block User'}
                          >
                            <AlertCircle size={16} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(u.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete User"
                          >
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

      {/* ─── Products Tab ─── */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package size={20} className="text-indigo-600" />{t("product_inventory")}</h2>
            <button onClick={openAddModal} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm">
              <Plus size={16} />{t("new_product")}</button>
          </div>
          
          {selectedProducts.length > 0 && (
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-1 rounded-md">{selectedProducts.length}</span>
                <span className="text-sm font-semibold text-indigo-900">{t("products_selected")}</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleBulkDiscount}
                  className="text-sm font-bold bg-white text-indigo-600 px-3 py-1.5 rounded-lg shadow-sm border border-indigo-200 hover:bg-indigo-100 transition"
                >{t("apply_bulk_discount")}</button>
                <button 
                  onClick={handleBulkDelete}
                  className="text-sm font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-700 transition"
                >{t("delete_selected")}</button>
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
                  <th className="px-6 py-4">{t("product")}</th>
                  <th className="px-6 py-4">{t("category")}</th>
                  <th className="px-6 py-4">{t("price")}</th>
                  <th className="px-6 py-4">{t("stock")}</th>
                  <th className="px-6 py-4">{t("organic")}</th>
                  <th className="px-6 py-4 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">{t("loading_catalog___")}</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">{t("no_products_in_inven")}</td></tr>
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

      {activeTab === 'schemes' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><ShieldCheck size={18}/>{t("manage_schemes")}</h3>
            <button onClick={() => {
                setSchemeForm({ title: '', description: '', eligibility: '', apply_link: '' });
                setShowSchemeModal(true);
              }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition">
              <Plus size={16} />{t("add_scheme")}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">{t("title")}</th>
                  <th className="px-6 py-3 font-semibold">{t("eligibility")}</th>
                  <th className="px-6 py-3 font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schemes.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">{s.title}</td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{s.eligibility}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => {
                        setConfirmModalState({ 
                          isOpen: true, actionType: 'delete_scheme', payload: s.id, 
                          title: 'Delete Scheme', message: 'Are you sure you want to completely delete this scheme?' 
                        });
                      }} className="text-red-500 hover:text-red-700 font-bold p-1 rounded hover:bg-red-50 transition">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {schemes.length === 0 && (
                  <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">{t("no_schemes_found_")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'organizations' && (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building size={20} className="text-indigo-600" />{t("farmer_producer_orga")}</h2>
          <button onClick={() => {
            setEditingOrg(null);
            setOrgForm({ name: '', org_type: 'Co-op' });
            setShowOrgModal(true);
          }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm">
            <Plus size={16} />{t("new_fpo")}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="px-6 py-4">{t("organization_name")}</th>
                <th className="px-6 py-4">{t("type")}</th>
                <th className="px-6 py-4">{t("members")}</th>
                <th className="px-6 py-4 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">{t("loading_organization")}</td></tr>
              ) : organizations.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">{t("no_organizations_fou")}</td></tr>
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
                    <td className="px-6 py-4 font-bold text-gray-900">{org.member_count} <span className="text-gray-500 font-normal">{t("users")}</span></td>
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
                                  .then((res) => { 
                                    toast.success("Added Member!"); 
                                    setOrganizations(prev => prev.map(o => o.id === org.id ? { ...o, member_count: (o.member_count || 0) + 1 } : o));
                                  })
                                  .catch(() => toast.error("Failed to add member"));
                            });
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition bg-indigo-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <UserPlus size={14} />{t("add")}</button>
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

      {/* ─── Experts Tab ─── */}
      {activeTab === 'experts' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity size={20} className="text-indigo-600" />{t("agronomy_experts")}</h2>
            <button onClick={() => {
              setExpertForm({ name: '', email: '', password: '', role: 'AGRONOMY_EXPERT', languages: 'English, Local' });
              setShowExpertModal(true);
            }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm">
              <UserPlus size={16} />{t("add_expert")}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="px-6 py-4">{t("expert_profile")}</th>
                  <th className="px-6 py-4">{t("languages")}</th>
                  <th className="px-6 py-4">{t("fee____")}</th>
                  <th className="px-6 py-4 text-center">{t("rating")}</th>
                  <th className="px-6 py-4 text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">{t("loading_experts___")}</td></tr>
                ) : experts.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">{t("no_experts_found_")}</td></tr>
                ) : (
                  experts.map(expert => (
                    <tr key={expert.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={expert.img} alt={expert.name} className="w-10 h-10 rounded-full bg-gray-200 border" />
                          <div>
                            <p className="font-bold text-gray-900">{expert.name}</p>
                            <p className="text-xs text-gray-500">{expert.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-semibold">{expert.lang}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">₹{expert.price}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1">
                          ⭐ {expert.rating}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <button 
                            onClick={() => {
                              setEditingExpert(expert);
                              // Using an empty email here since we don't return email in /consultations/experts response
                              // A full implementation would fetch the specific user or return email in the expert list
                              setExpertForm({ name: expert.name, email: '', password: '', role: 'AGRONOMY_EXPERT', languages: expert.lang });
                              setShowExpertModal(true);
                            }} 
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Edit Expert"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteExpert(expert.id)} 
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete Expert"
                          >
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

      {/* ─── Inventory Tab ─── */}
      {activeTab === 'inventory' && (
        <Inventory />
      )}

      {/* ─── CMS Tab ─── */}
      {activeTab === 'cms' && (
        <CMS />
      )}

      {/* ─── Sponsored Ads Tab ─── */}
      {activeTab === 'ads' && (
        <AdminAdsManagement />
      )}

      {/* ─── Expert Modal ─── */}
      <AnimatePresence>
        {showExpertModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExpertModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <UserPlus className="text-indigo-600" /> {editingExpert ? 'Edit Expert Profile' : 'Register New Expert'}
                </h3>
                <button onClick={() => setShowExpertModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveExpert} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">{t("full_name__")}</label>
                  <input required type="text" value={expertForm.name} onChange={e => setExpertForm({...expertForm, name: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900" placeholder="e.g. Dr. Jane Smith" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">{t("email_address")}{editingExpert && '(Optional to update)'}</label>
                  <input required={!editingExpert} type="email" value={expertForm.email} onChange={e => setExpertForm({...expertForm, email: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900" placeholder="expert@dragri.ai" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">{t("spoken_languages")}</label>
                  <input required type="text" value={expertForm.languages} onChange={e => setExpertForm({...expertForm, languages: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900" placeholder="e.g. English, Hindi, Kannada" />
                </div>
                {!editingExpert && (
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700">{t("password__")}</label>
                    <input required minLength="6" type="password" value={expertForm.password} onChange={e => setExpertForm({...expertForm, password: e.target.value})} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900" placeholder="Min 6 characters" />
                  </div>
                )}
                
                <div className="pt-4 mt-2 border-t border-gray-100 flex gap-3">
                  <button type="button" onClick={() => setShowExpertModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">{t("cancel")}</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md disabled:opacity-70 flex justify-center items-center gap-2">
                    {saving ? 'Saving...' : (editingExpert ? 'Save Changes' : 'Create Expert')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  <label className="block text-sm font-medium mb-1 text-gray-700">{t("product_name__")}</label>
                  <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">{t("category__")}</label>
                    <select required value={form.category} onChange={e => setForm({...form, category: e.target.value})} 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">{t("price______")}</label>
                    <input required type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({...form, price: e.target.value})} 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">{t("stock_quantity")}</label>
                    <input type="number" min="0" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})} 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">{t("discount____")}</label>
                    <input type="number" step="0.1" min="0" max="100" value={form.discount_percentage} onChange={e => setForm({...form, discount_percentage: e.target.value})} 
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">{t("description")}</label>
                  <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} 
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">{t("image_url__optional_")}</label>
                  <input type="url" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700">{t("dosage_per_acre")}</label>
                    <input type="text" value={form.dosage_per_acre} onChange={e => setForm({...form, dosage_per_acre: e.target.value})} placeholder="e.g. 2 Litres"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="flex items-center justify-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.is_organic} onChange={e => setForm({...form, is_organic: e.target.checked})} 
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm font-bold text-gray-700">{t("is_organic_")}</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">{t("cancel")}</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-70">
                    {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── User Delete Confirm Modal ─── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 text-center">
              
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{t("delete_user_")}</h3>
              <p className="text-gray-500 mb-6 text-sm font-medium">{t("this_action_cannot_b")}</p>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">{t("cancel")}</button>
                <button type="button" onClick={executeDeleteUser} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition shadow-md">{t("yes__delete")}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── User Edit Modal ─── */}
      <AnimatePresence>
        {showUserModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUserModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Edit3 className="text-indigo-600" />{t("edit_user_profile")}</h3>
                <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">{t("full_name__")}</label>
                  <input required type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">{t("email_address__")}</label>
                  <input required type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900" />
                </div>
                
                <div className="pt-4 mt-2 border-t border-gray-100 flex gap-3">
                  <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">{t("cancel")}</button>
                  <button type="submit" disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md disabled:opacity-70 flex justify-center items-center gap-2">
                    {saving ? 'Saving...' : 'Update User'}
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
                  <ShieldCheck className="text-indigo-600" />{t("change_role")}</h3>
                <p className="text-sm text-gray-500 mt-1">{t("assigning_a_new_role")}<span className="font-bold text-gray-900">{roleUser?.name}</span></p>
              </div>

              <form onSubmit={submitRoleChange} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">{t("select_role")}</label>
                  <select 
                    required 
                    value={selectedRole} 
                    onChange={e => setSelectedRole(e.target.value)} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700 cursor-pointer"
                  >
                    <option value="FARMER">{t("______farmer__defaul")}</option>
                    <option value="AGRONOMY_EXPERT">{t("___agronomy_expert")}</option>
                    <option value="DELIVERY_PARTNER">{t("___delivery_partner")}</option>
                    <option value="WAREHOUSE_MANAGER">{t("___warehouse_manager")}</option>

                    <option value="NURSERY_MANAGER">{t("___nursery_manager")}</option>
                    <option value="ADMIN">{t("____admin")}</option>
                    <option value="SUPER_ADMIN">{t("___super_admin")}</option>
                  </select>
                </div>
                
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setShowRoleModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">{t("cancel")}</button>
                  <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md">{t("update_role")}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ─── Scheme Edit Modal ─── */}
      <AnimatePresence>
        {showSchemeModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSchemeModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
              
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="text-blue-600" />{t("add_govt_scheme")}</h3>
                <button onClick={() => setShowSchemeModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition"><X size={18} /></button>
              </div>

              <form onSubmit={handleSaveScheme} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">{t("scheme_title__")}</label>
                  <input required type="text" value={schemeForm.title} onChange={e => setSchemeForm({...schemeForm, title: e.target.value})} 
                    placeholder="e.g. PM-Kisan Samman Nidhi"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">{t("description__")}</label>
                  <textarea required rows={2} value={schemeForm.description} onChange={e => setSchemeForm({...schemeForm, description: e.target.value})} 
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">{t("eligibility_criteria")}</label>
                  <input required type="text" value={schemeForm.eligibility} onChange={e => setSchemeForm({...schemeForm, eligibility: e.target.value})} 
                    placeholder="e.g. All landholding farmers"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-gray-700">{t("application_url__")}</label>
                  <input required type="url" value={schemeForm.apply_link} onChange={e => setSchemeForm({...schemeForm, apply_link: e.target.value})} 
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900" />
                </div>
                
                <div className="pt-4 mt-2 border-t border-gray-100 flex gap-3">
                  <button type="button" onClick={() => setShowSchemeModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">{t("cancel")}</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-70">
                    {saving ? 'Saving...' : 'Publish Scheme'}
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
                  <label className="block text-sm font-bold mb-2 text-gray-700">{t("fpo_name__")}</label>
                  <input required type="text" value={orgForm.name} onChange={e => setOrgForm({...orgForm, name: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700">{t("organization_type__")}</label>
                  <select required value={orgForm.org_type} onChange={e => setOrgForm({...orgForm, org_type: e.target.value})} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-gray-700 cursor-pointer">
                    <option value="Co-op">{t("co_operative")}</option>
                    <option value="Farm">{t("corporate_farm")}</option>
                    <option value="Govt">{t("government_body")}</option>
                    <option value="Nursery">{t("nursery_group")}</option>
                    <option value="NGO">{t("non_profit___ngo")}</option>
                  </select>
                </div>
                
                <div className="pt-4 mt-2 border-t border-gray-100 flex gap-3">
                  <button type="button" onClick={() => setShowOrgModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition">{t("cancel")}</button>
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
