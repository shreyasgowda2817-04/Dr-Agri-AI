import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';
import { Package, AlertTriangle, CheckCircle, Store, TrendingUp, Edit2, MapPin, Plus, Trash2, IndianRupee, Activity, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { toast } from 'react-toastify';

const Inventory = () => {
  const { t } = useTranslation();
  

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Adjust Stock Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustAction, setAdjustAction] = useState('add');

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null, name: '' });

  // Add Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Fertilizer',
    zone: 'Zone A',
    initial_stock: 0,
    threshold: 10,
    price_per_unit: 0.0
  });

  useEffect(() => {
    fetchInventory();
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    

    setLoadingLogs(true);
    try {
      const res = await api.get('/inventory/logs');
      setLogs(res.data);
    } catch (error) {
      console.error('Failed to load inventory logs', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchInventory = async () => {
    

    setLoading(true);
    try {
      const res = await api.get('/inventory/stock');
      setInventory(res.data);
    } catch (error) {
      toast.error('Failed to load warehouse inventory.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (e) => {
    

    e.preventDefault();
    try {
      const amt = parseInt(adjustAmount);
      const res = await api.post(`/inventory/adjust/${selectedItem.id}`, {
        action: adjustAction,
        quantity: amt
      });
      const newStock = res.data.new_stock;
      
      setInventory(prev => prev.map(item => 
        item.id === selectedItem.id 
          ? { ...item, stock: newStock, status: newStock <= item.threshold ? 'Low Stock' : 'In Stock' }
          : item
      ));

      setLogs(prev => [{
        _id: Date.now().toString(),
        item_name: selectedItem.name,
        action: adjustAction === 'add' ? 'ADD_STOCK' : 'REMOVE_STOCK',
        quantity_change: adjustAction === 'add' ? amt : -amt,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 50));

      toast.success('Stock adjusted successfully!');
      setShowAdjustModal(false);
    } catch (err) {
      toast.error('Failed to adjust stock');
    }
  };

  const handleAddItem = async (e) => {
    

    e.preventDefault();
    try {
      const payload = {
        ...newItem,
        initial_stock: parseInt(newItem.initial_stock),
        threshold: parseInt(newItem.threshold),
        price_per_unit: parseFloat(newItem.price_per_unit)
      };
      const res = await api.post('/inventory/item', payload);
      
      const addedItem = {
        id: res.data.id,
        name: payload.name,
        category: payload.category,
        stock: payload.initial_stock,
        threshold: payload.threshold,
        zone: payload.zone,
        status: payload.initial_stock <= payload.threshold ? 'Low Stock' : 'In Stock',
        price_per_unit: payload.price_per_unit
      };
      
      setInventory(prev => [...prev, addedItem]);
      setLogs(prev => [{
        _id: Date.now().toString(),
        item_name: addedItem.name,
        action: 'CREATE_ITEM',
        quantity_change: addedItem.stock,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 50));

      toast.success('New SKU added successfully!');
      setShowAddModal(false);
      setNewItem({
        name: '', category: 'Fertilizer', zone: 'Zone A',
        initial_stock: 0, threshold: 10, price_per_unit: 0.0
      });
    } catch (err) {
      toast.error('Failed to add new item');
    }
  };

  const handleDeleteClick = (id, name) => {
    

    setConfirmModal({ isOpen: true, id, name });
  };

  const performDelete = async () => {
    

    try {
      await api.delete(`/inventory/item/${confirmModal.id}`);
      
      setInventory(prev => prev.filter(i => i.id !== confirmModal.id));
      setLogs(prev => [{
        _id: Date.now().toString(),
        item_name: confirmModal.name,
        action: 'DELETE_ITEM',
        quantity_change: 0,
        timestamp: new Date().toISOString()
      }, ...prev].slice(0, 50));

      toast.success(`${confirmModal.name} deleted successfully!`);
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const openAdjustModal = (item) => {
    

    setSelectedItem(item);
    setAdjustAmount(0);
    setAdjustAction('add');
    setShowAdjustModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const lowStockCount = inventory.filter(i => i.stock <= i.threshold).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.stock * (item.price_per_unit || 0)), 0);

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8 w-full min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 flex items-center gap-2 sm:gap-3 tracking-tight">
            <Store className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600 bg-indigo-100 p-1.5 sm:p-2 rounded-xl shrink-0" />
            <span className="truncate">{t("warehouse_supply_cha")}</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">{t("manage_stock_locatio")}</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto justify-center bg-indigo-600 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center gap-2 text-sm sm:text-base shrink-0"
        >
          <Plus size={18} />{t("add_new_sku")}</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-center mb-4">
            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600"><Package /></div>
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t("total_skus")}</span>
          </div>
          <h3 className="text-3xl font-black text-gray-900">{inventory.length}</h3>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-center mb-4">
            <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><IndianRupee /></div>
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t("total_value")}</span>
          </div>
          <h3 className="text-3xl font-black text-gray-900">₹{totalValue.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-center mb-4">
            <div className="bg-blue-100 p-3 rounded-xl text-blue-600"><CheckCircle /></div>
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t("healthy_stock")}</span>
          </div>
          <h3 className="text-3xl font-black text-gray-900">{inventory.length - lowStockCount}</h3>
        </div>

        <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-200 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-center mb-4">
            <div className="bg-rose-100 p-3 rounded-xl text-rose-600"><AlertTriangle /></div>
            <span className="text-sm font-bold text-rose-500 uppercase tracking-wider">{t("needs_restock")}</span>
          </div>
          <h3 className="text-3xl font-black text-rose-900">{lowStockCount}</h3>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="text-gray-400" />{t("multi_zone_stock_lev")}</h2>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="px-6 py-4">{t("sku___product_name")}</th>
                <th className="px-6 py-4">{t("category")}</th>
                <th className="px-6 py-4">{t("warehouse_zone")}</th>
                <th className="px-6 py-4">{t("stock_level")}</th>
                <th className="px-6 py-4">{t("unit_value")}</th>
                <th className="px-6 py-4 text-center">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <Package size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="font-bold">{t("no_inventory_found_")}</p>
                    <p className="text-sm">{t("add_a_new_sku_to_sta")}</p>
                  </td>
                </tr>
              ) : (
                inventory.map(item => {
                  const isLow = item.stock <= item.threshold;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition group">
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-400 font-black mb-1">{item.id}</div>
                        <div className="font-bold text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-indigo-700">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-indigo-400" /> {item.zone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-xl text-sm font-bold flex items-center w-max gap-2 ${
                          isLow ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {isLow && <AlertTriangle size={14} className="text-rose-500"/>}
                          {item.stock}{t("units")}</span>
                        <div className="text-xs text-gray-400 mt-1">{t("min_")}{item.threshold}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">₹{item.price_per_unit?.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{t("total___")}{((item.price_per_unit || 0) * item.stock).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button 
                            onClick={() => openAdjustModal(item)}
                            className="bg-white border border-gray-200 text-gray-700 p-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition shadow-sm"
                            title="Adjust Stock"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(item.id, item.name)}
                            className="bg-white border border-gray-200 text-gray-700 p-2 rounded-xl hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition shadow-sm"
                            title="Delete Item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Logs Panel */}
      <div className="mt-8 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="text-indigo-600" />{t("automated_activity_l")}</h2>
        </div>
        <div className="p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
          {loadingLogs ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Clock size={40} className="mx-auto text-gray-300 mb-4" />
              <p className="font-bold">{t("no_activity_recorded")}</p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
              {logs.map((log) => {
                let badgeColor = "bg-gray-100 text-gray-600";
                let actionText = log.action;
                let sign = "";
                
                if (log.action === "ADD_STOCK") {
                  badgeColor = "bg-emerald-100 text-emerald-700";
                  actionText = "Added Stock";
                  sign = "+";
                } else if (log.action === "REMOVE_STOCK") {
                  badgeColor = "bg-rose-100 text-rose-700";
                  actionText = "Removed Stock";
                } else if (log.action === "CREATE_ITEM") {
                  badgeColor = "bg-indigo-100 text-indigo-700";
                  actionText = "Created Item";
                  sign = "+";
                } else if (log.action === "DELETE_ITEM") {
                  badgeColor = "bg-red-100 text-red-700";
                  actionText = "Deleted Item";
                }

                return (
                  <div key={log._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${badgeColor}`}>
                        <Activity size={14} />
                      </div>
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${badgeColor}`}>
                          {actionText}
                        </span>
                        <time className="text-xs font-medium text-gray-400 flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(log.timestamp).toLocaleString()}
                        </time>
                      </div>
                      <h4 className="font-bold text-gray-900 mt-2">{log.item_name}</h4>
                      <div className="text-sm text-gray-500 mt-2 flex items-center gap-4">
                        <div>{t("delta_")}<strong className={log.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'}>{sign}{log.quantity_change}</strong></div>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <div>{t("stock_")}<strong>{log.previous_stock} → {log.new_stock}</strong></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Adjust Stock Modal */}
      <AnimatePresence>
        {showAdjustModal && selectedItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-2">{t("adjust_inventory")}</h2>
              <p className="text-gray-500 font-medium mb-6">{t("updating_stock_for")}<strong className="text-gray-900">{selectedItem.name}</strong></p>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6 flex justify-between items-center border border-gray-100">
                <span className="text-sm font-bold text-gray-500">{t("current_stock")}</span>
                <span className="text-2xl font-black text-indigo-700">{selectedItem.stock}</span>
              </div>

              <form onSubmit={handleAdjustStock} className="space-y-4">
                <div className="flex gap-4">
                  <label className={`flex-1 p-3 rounded-xl border-2 font-bold text-center cursor-pointer transition ${adjustAction === 'add' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>
                    <input type="radio" name="action" className="hidden" checked={adjustAction === 'add'} onChange={() => setAdjustAction('add')} />{t("__add_stock")}</label>
                  <label className={`flex-1 p-3 rounded-xl border-2 font-bold text-center cursor-pointer transition ${adjustAction === 'remove' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-500'}`}>
                    <input type="radio" name="action" className="hidden" checked={adjustAction === 'remove'} onChange={() => setAdjustAction('remove')} />{t("__remove_stock")}</label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t("quantity_to")}{adjustAction}</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-lg font-black text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={adjustAmount || ''}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setShowAdjustModal(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                  >{t("cancel")}</button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-md"
                  >{t("confirm_update")}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add New SKU Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-2">
                <Package className="text-indigo-600" />{t("add_new_sku")}</h2>
              <p className="text-gray-500 font-medium mb-6">{t("create_a_new_item_in")}</p>
              
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t("product_name")}</label>
                  <input 
                    type="text" required
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    placeholder="e.g. Premium Urea 46%"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t("category")}</label>
                    <select 
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    >
                      <option>{t("fertilizer")}</option>
                      <option>{t("pesticide")}</option>
                      <option>{t("seeds")}</option>
                      <option>{t("equipment")}</option>
                      <option>{t("other")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t("warehouse_zone")}</label>
                    <select 
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newItem.zone}
                      onChange={(e) => setNewItem({...newItem, zone: e.target.value})}
                    >
                      <option>{t("zone_a")}</option>
                      <option>{t("zone_b")}</option>
                      <option>{t("zone_c")}</option>
                      <option>{t("zone_d")}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t("initial_stock")}</label>
                    <input 
                      type="number" required min="0"
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newItem.initial_stock}
                      onChange={(e) => setNewItem({...newItem, initial_stock: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t("low_stock_threshold")}</label>
                    <input 
                      type="number" required min="0"
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newItem.threshold}
                      onChange={(e) => setNewItem({...newItem, threshold: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t("price_per_unit____")}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-gray-500 font-bold">₹</span>
                    <input 
                      type="number" required min="0" step="0.01"
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 pl-8 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={newItem.price_per_unit}
                      onChange={(e) => setNewItem({...newItem, price_per_unit: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                  >{t("cancel")}</button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-md flex justify-center items-center gap-2"
                  >
                    <Plus size={18} />{t("add_sku")}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inventory;
