import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Plus, Trash2, Edit3, CalendarDays, Activity, X, Image, ChevronDown, Sprout } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-toastify';
import Calendar from './Calendar';

const CROP_STAGES = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Ripening', 'Harvest', 'Post-Harvest'];

const STAGE_COLORS = {
  Seedling: 'bg-lime-100 text-lime-700',
  Vegetative: 'bg-green-100 text-green-700',
  Flowering: 'bg-pink-100 text-pink-700',
  Fruiting: 'bg-orange-100 text-orange-700',
  Ripening: 'bg-amber-100 text-amber-700',
  Harvest: 'bg-yellow-100 text-yellow-700',
  'Post-Harvest': 'bg-gray-100 text-gray-600',
};

const COMMON_CROPS = [
  'Tomato', 'Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Soybean',
  'Groundnut', 'Sunflower', 'Bajra', 'Jowar', 'Potato', 'Onion', 'Chilli',
  'Banana', 'Mango', 'Grapes', 'Pomegranate', 'Cabbage', 'Brinjal'
];

const EMPTY_FORM = {
  farm_id: '', crop_name: '', variety: '', planting_date: '', expected_harvest_date: '',
  crop_stage: 'Seedling', area_acres: '', notes: ''
};

const CropManager = () => {
  const { t } = useTranslation();
  

  const [searchParams] = useSearchParams();
  const farmIdFilter = searchParams.get('farm_id');

  const [farms, setFarms] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, farm_id: farmIdFilter || '' });
  const [saving, setSaving] = useState(false);

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [filterFarm, setFilterFarm] = useState(farmIdFilter || '');
  const [activeTab, setActiveTab] = useState('crops'); // 'crops' or 'calendar'

  useEffect(() => {
    fetchData();
  }, [filterFarm]);

  const fetchData = async () => {
    

    setLoading(true);
    try {
      const [farmsRes, cropsRes] = await Promise.all([
        api.get('/farms'),
        api.get('/crops' + (filterFarm ? `?farm_id=${filterFarm}` : ''))
      ]);
      setFarms(farmsRes.data);
      setCrops(cropsRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    

    setEditingCrop(null);
    setForm({ ...EMPTY_FORM, farm_id: filterFarm || (farms[0]?.id || '') });
    setShowModal(true);
  };

  const openEdit = (crop) => {
    

    setEditingCrop(crop);
    setForm({
      farm_id: crop.farm_id || '',
      crop_name: crop.crop_name || '',
      variety: crop.variety || '',
      planting_date: crop.planting_date || '',
      expected_harvest_date: crop.expected_harvest_date || '',
      crop_stage: crop.crop_stage || 'Seedling',
      area_acres: crop.area_acres || '',
      notes: crop.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    

    if (!form.farm_id || !form.crop_name) {
      toast.error('Please select a farm and enter a crop name.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        area_acres: form.area_acres ? parseFloat(form.area_acres) : null,
      };
      if (editingCrop) {
        const res = await api.put(`/crops/${editingCrop.id}`, payload);
        setCrops(prev => prev.map(c => c.id === editingCrop.id ? res.data : c));
        toast.success('Crop updated!');
      } else {
        const res = await api.post('/crops', payload);
        setCrops(prev => [...prev, res.data]);
        toast.success('Crop registered!');
      }
      setShowModal(false);
    } catch (err) {
      toast.error('Failed to save crop.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id) => {
    

    setConfirmModal({ isOpen: true, id });
  };

  const performDelete = async () => {
    

    try {
      await api.delete(`/crops/${confirmModal.id}`);
      setCrops(prev => prev.filter(c => c.id !== confirmModal.id));
      toast.success('Crop deleted');
    } catch {
      toast.error('Failed to delete crop');
    }
  };

  const getFarmName = (farmId) => farms.find(f => f.id === farmId)?.name || 'Unknown Farm';

  const daysUntilHarvest = (dateStr) => {
    

    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={performDelete}
        title="Delete Crop"
        message="Are you sure you want to delete this crop record? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <Leaf className="text-green-600 shrink-0" />{t("crop_manager")}</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">{t("track_every_crop_acr")}</p>
        </div>
        <button
          onClick={openAdd}
          className="w-full sm:w-auto justify-center bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition shadow-md shadow-green-100 text-sm"
        >
          <Plus size={18} />{t("register_crop")}</button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 mb-6 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('crops')}
          className={`pb-3 px-3 sm:px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'crops'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sprout size={18} />{t("my_crops")}</button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-3 px-3 sm:px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition shrink-0 ${
            activeTab === 'calendar'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays size={18} />{t("crop_calendar")}</button>
      </div>

      {activeTab === 'calendar' ? (
        <div className="-mt-8">
          <Calendar />
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="flex gap-2 sm:gap-3 mb-6 overflow-x-auto pb-1 max-w-full">
        <FilterPill label="All Farms" active={filterFarm === ''} onClick={() => setFilterFarm('')} />
        {farms.map(f => (
          <FilterPill key={f.id} label={f.name} active={filterFarm === f.id} onClick={() => setFilterFarm(f.id)} />
        ))}
      </div>

      {/* Crop Grid */}
      {loading ? (
        <p className="text-center py-20 text-gray-400">{t("loading_crops___")}</p>
      ) : crops.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 p-4">
          <Leaf className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-600 mb-2">{t("no_crops_registered_")}</h3>
          <p className="text-gray-400 mb-6 text-sm">{t("register_crops_to_tr")}</p>
          <button onClick={openAdd} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition text-sm">{t("__register_first_cro")}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {crops.map(crop => {
            const harvestDays = daysUntilHarvest(crop.expected_harvest_date);
            return (
              <motion.div
                key={crop.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition"
              >
                {/* Stage Color Bar */}
                <div className="h-1.5 w-full" style={{ background: getStageGradient(crop.crop_stage) }} />

                <div className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-lg leading-tight">{crop.crop_name}</h3>
                      {crop.variety && <p className="text-sm text-gray-500">{crop.variety}</p>}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STAGE_COLORS[crop.crop_stage] || 'bg-gray-100 text-gray-600'}`}>
                      {crop.crop_stage || 'Unknown'}
                    </span>
                  </div>

                  {/* Farm badge */}
                  <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                    🏡 {getFarmName(crop.farm_id)} {crop.area_acres ? `· ${crop.area_acres} acres` : ''}
                  </p>

                  {/* Dates */}
                  <div className="space-y-1.5 mb-4">
                    {crop.planting_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CalendarDays size={13} className="text-green-500" />
                        <span>{t("planted_")}<strong>{new Date(crop.planting_date).toLocaleDateString()}</strong></span>
                      </div>
                    )}
                    {crop.expected_harvest_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CalendarDays size={13} className="text-amber-500" />
                        <span>{t("harvest_")}<strong>{new Date(crop.expected_harvest_date).toLocaleDateString()}</strong>
                          {harvestDays !== null && (
                            <span className={`ml-1.5 text-xs font-bold ${harvestDays < 0 ? 'text-red-500' : harvestDays < 14 ? 'text-amber-500' : 'text-green-500'}`}>
                              ({harvestDays < 0 ? `${Math.abs(harvestDays)}d ago` : `${harvestDays}d`})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {crop.notes && (
                    <p className="text-xs text-gray-400 italic mb-4 line-clamp-2">{crop.notes}</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(crop)}
                      className="flex-1 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-1">
                      <Edit3 size={14} />{t("edit")}</button>
                    <button onClick={() => handleDeleteClick(crop.id)}
                      className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      </>
      )}

      {/* ── Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-3xl z-10">
                <h3 className="text-lg font-bold text-gray-900">{editingCrop ? 'Edit Crop' : 'Register Crop'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-4">
                {/* Farm */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("farm__")}</label>
                  <select value={form.farm_id} onChange={e => setForm(p => ({ ...p, farm_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white">
                    <option value="">{t("select_farm")}</option>
                    {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                {/* Crop Name with suggestions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("crop_name__")}</label>
                  <input
                    list="crop-suggestions"
                    value={form.crop_name}
                    onChange={e => setForm(p => ({ ...p, crop_name: e.target.value }))}
                    placeholder="e.g. Tomato"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <datalist id="crop-suggestions">
                    {COMMON_CROPS.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <MField label="Variety (optional)" value={form.variety} onChange={v => setForm(p => ({ ...p, variety: v }))} placeholder="e.g. Cherry, Durum, Basmati" />

                {/* Stage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t("crop_stage")}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CROP_STAGES.map(stage => (
                      <button
                        key={stage}
                        onClick={() => setForm(p => ({ ...p, crop_stage: stage }))}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition border ${
                          form.crop_stage === stage
                            ? 'border-green-500 bg-green-50 text-green-800'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <MField label="Planting Date" value={form.planting_date} onChange={v => setForm(p => ({ ...p, planting_date: v }))} type="date" />
                  <MField label="Expected Harvest" value={form.expected_harvest_date} onChange={v => setForm(p => ({ ...p, expected_harvest_date: v }))} type="date" />
                </div>

                <MField label="Area (Acres)" value={form.area_acres} onChange={v => setForm(p => ({ ...p, area_acres: v }))} placeholder="e.g. 2.5" type="number" />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("notes")}</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Any observations or notes about this crop..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none" />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-3xl flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition">{t("cancel")}</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-70">
                  {saving ? 'Saving...' : editingCrop ? 'Update Crop' : 'Register Crop'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
      active ? 'bg-green-600 text-white shadow' : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
    }`}
  >
    {label}
  </button>
);

const MField = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none placeholder-gray-400" />
  </div>
);

const getStageGradient = (stage) => {
  

  const map = {
    Seedling: 'linear-gradient(to right, #84cc16, #65a30d)',
    Vegetative: 'linear-gradient(to right, #22c55e, #16a34a)',
    Flowering: 'linear-gradient(to right, #f472b6, #ec4899)',
    Fruiting: 'linear-gradient(to right, #fb923c, #ea580c)',
    Ripening: 'linear-gradient(to right, #fbbf24, #d97706)',
    Harvest: 'linear-gradient(to right, #facc15, #ca8a04)',
    'Post-Harvest': 'linear-gradient(to right, #9ca3af, #6b7280)',
  };
  return map[stage] || '#e5e7eb';
};

export default CropManager;
