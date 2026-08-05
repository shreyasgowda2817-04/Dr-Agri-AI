import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, Edit3, Leaf, Droplets, Layers, Navigation, X, ChevronRight, Tractor, Target } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

// Fix Leaflet Default Icon Issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SOIL_TYPES = ['Clay', 'Loamy', 'Sandy', 'Silty', 'Peaty', 'Chalky', 'Black Cotton', 'Red Laterite'];
const WATER_SOURCES = ['Borewell', 'Canal', 'River', 'Rainwater', 'Tank / Pond', 'Municipal Supply'];
const IRRIGATION_TYPES = ['Drip Irrigation', 'Sprinkler', 'Flood / Furrow', 'Manual Watering', 'Centre Pivot', 'Subsurface'];

const EMPTY_FORM = {
  name: '', area_acres: '', crop: '', status: 'Active',
  location_name: '', latitude: '', longitude: '', soil_type: '', water_source: '', irrigation_type: '', description: ''
};

// Component to programmatically fly to location
const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 14, { duration: 1.5 });
  }, [center, map]);
  return null;
};

const FarmManager = () => {
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [activeCenter, setActiveCenter] = useState([20.5937, 78.9629]); // Default to India center

  useEffect(() => { fetchFarms(); }, []);

  const fetchFarms = async () => {
    try {
      const res = await api.get('/farms');
      setFarms(res.data);
      if (res.data.length > 0) {
        // Find first farm with coordinates
        const validFarm = res.data.find(f => f.latitude && f.longitude);
        if (validFarm) {
          setActiveCenter([parseFloat(validFarm.latitude), parseFloat(validFarm.longitude)]);
        }
      }
    } catch (err) {
      toast.error('Failed to load farms');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingFarm(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (farm) => {
    setEditingFarm(farm);
    setForm({
      name: farm.name || '',
      area_acres: farm.area_acres || '',
      crop: farm.crop || '',
      status: farm.status || 'Active',
      location_name: farm.location_name || '',
      latitude: farm.latitude || '',
      longitude: farm.longitude || '',
      soil_type: farm.soil_type || '',
      water_source: farm.water_source || '',
      irrigation_type: farm.irrigation_type || '',
      description: farm.description || '',
    });
    setShowModal(true);
  };

  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const locName = data.address?.village || data.address?.town || data.address?.city || data.address?.county || 'GPS Location';
          setForm(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6), location_name: locName }));
          setActiveCenter([lat, lng]);
        } catch (e) {
          setForm(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6), location_name: 'GPS Location' }));
          setActiveCenter([lat, lng]);
        }
        setLocating(false);
        toast.success('Location detected!');
      },
      () => { toast.error('Location access denied'); setLocating(false); }
    );
  };

  const handleSearchLocation = async (e) => {
    e.preventDefault();
    if (!form.location_name) return;
    toast.info('Searching map...');
    try {
      const res = await api.get(`/geocode?q=${encodeURIComponent(form.location_name)}`);
      if (res.data && res.data.lat) {
        const lat = res.data.lat;
        const lng = res.data.lon;
        setForm(p => ({ ...p, latitude: lat, longitude: lng }));
        setActiveCenter([lat, lng]);
        toast.success('Location found!');
      } else {
        toast.error('Location not found. Try adding city/state.');
      }
    } catch (err) {
      toast.error('Search failed.');
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.area_acres) {
      toast.error('Farm name and area are required.');
      return;
    }
    setSaving(true);
    
    let lat = form.latitude;
    let lng = form.longitude;
    
    if (form.location_name && (!lat || !lng)) {
      try {
        const res = await api.get(`/geocode?q=${encodeURIComponent(form.location_name)}`);
        if (res.data && res.data.lat) {
          lat = res.data.lat;
          lng = res.data.lon;
        }
      } catch (e) {
        console.error("Geocoding failed", e);
      }
    }

    const payload = {
      ...form,
      area_acres: parseFloat(form.area_acres),
      location_name: form.location_name,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null,
    };
    try {
      if (editingFarm) {
        await api.put(`/farms/${editingFarm.id}`, payload);
        toast.success('Farm updated!');
      } else {
        await api.post('/farms', payload);
        toast.success('Farm registered!');
      }
      setShowModal(false);
      fetchFarms();
    } catch (err) {
      toast.error('Failed to save farm.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this farm and all its crops?')) return;
    try {
      await api.delete(`/farms/${id}`);
      toast.success('Farm deleted');
      fetchFarms();
    } catch {
      toast.error('Failed to delete farm');
    }
  };

  const handleFarmClick = (farm) => {
    if (farm.latitude && farm.longitude) {
      setActiveCenter([parseFloat(farm.latitude), parseFloat(farm.longitude)]);
    }
  };

  const totalAcres = farms.reduce((acc, f) => acc + (f.area_acres || 0), 0);
  const totalCrops = farms.reduce((acc, f) => acc + (f.crops?.length || 0), 0);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-73px)] w-full overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors">
      
      {/* ─── LEFT SIDEBAR (List View) ─── */}
      <div className="w-full md:w-[400px] xl:w-[450px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full z-10 shadow-xl overflow-hidden shrink-0">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="text-emerald-500" /> GIS Manager
            </h1>
            <button
              onClick={openAddModal}
              className="bg-emerald-500 text-white p-2 rounded-xl hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20"
              title="Add New Farm Plot"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Total Area</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">{totalAcres.toFixed(1)} <span className="text-sm font-medium text-gray-500">ac</span></p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">Active Plots</p>
              <p className="text-xl font-black text-emerald-900 dark:text-emerald-400">{farms.length}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Farm List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-950/50">
          {loading ? (
            <p className="text-center py-10 text-gray-400 font-medium">Loading geospatial data...</p>
          ) : farms.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Tractor className="text-gray-400 w-8 h-8" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-bold mb-2">No farms mapped</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Add your first farm plot to begin IoT telemetry mapping.</p>
              <button onClick={openAddModal} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-bold hover:scale-[1.02] transition">
                Map New Farm
              </button>
            </div>
          ) : (
            farms.map(farm => (
              <motion.div
                key={farm.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => handleFarmClick(farm)}
                className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-600 transition cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">{farm.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 font-medium">
                      <Target size={12} /> {farm.area_acres} acres · {farm.crop || 'Mixed'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${farm.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                    {farm.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {farm.soil_type && <span className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-md font-medium border border-gray-100 dark:border-gray-700">{farm.soil_type}</span>}
                  {farm.irrigation_type && <span className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-md font-medium border border-gray-100 dark:border-gray-700">{farm.irrigation_type}</span>}
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-50 dark:border-gray-800">
                  <Link
                    to={`/crops?farm_id=${farm.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold py-2 rounded-lg text-center hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition flex items-center justify-center gap-1"
                  >
                    Manage Crops <ChevronRight size={12} />
                  </Link>
                  <button onClick={(e) => { e.stopPropagation(); openEditModal(farm); }} className="p-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(farm.id); }} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ─── RIGHT AREA (Interactive Map) ─── */}
      <div className="flex-1 relative bg-gray-200 dark:bg-gray-800 z-0 h-[40vh] md:h-full">
        {/* Map Overlay Controls */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-xl p-3 shadow-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Telemetry Active</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Soil Moisture Normal</div>
          </div>
        </div>

        <MapContainer center={activeCenter} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <MapController center={activeCenter} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />
          {farms.map(farm => {
            if (!farm.latitude || !farm.longitude) return null;
            return (
              <Marker key={farm.id} position={[parseFloat(farm.latitude), parseFloat(farm.longitude)]}>
                <Popup className="farm-popup">
                  <div className="p-1">
                    <h4 className="font-bold text-gray-900 mb-1">{farm.name}</h4>
                    <p className="text-xs text-gray-600 mb-2">{farm.area_acres} Acres · {farm.crop}</p>
                    <Link to={`/crops?farm_id=${farm.id}`} className="text-xs font-bold text-emerald-600 hover:underline">View Telemetry &rarr;</Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Global Dark Mode CSS for Leaflet override */}
        <style>{`
          html.dark .map-tiles {
            filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          }
        `}</style>
      </div>

      {/* ── Add / Edit Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-[500] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            >
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex justify-between items-center rounded-t-3xl shrink-0 z-10">
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{editingFarm ? 'Edit Farm Parameters' : 'Register New Farm Plot'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Farm Name *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. North Field" />
                  <FormField label="Area (Acres) *" value={form.area_acres} onChange={v => setForm(p => ({ ...p, area_acres: v }))} placeholder="e.g. 5.5" type="number" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Primary Crop" value={form.crop} onChange={v => setForm(p => ({ ...p, crop: v }))} placeholder="e.g. Tomato, Wheat" />
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition">
                      <option>Active</option><option>Fallow</option><option>Harvested</option><option>Preparing</option>
                    </select>
                  </div>
                </div>

                {/* Soil & Water */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                  <p className="text-xs font-black text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-widest">Soil & Irrigation Telemetry</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SelectField label="Soil Type" value={form.soil_type} onChange={v => setForm(p => ({ ...p, soil_type: v }))} options={SOIL_TYPES} />
                    <SelectField label="Water Source" value={form.water_source} onChange={v => setForm(p => ({ ...p, water_source: v }))} options={WATER_SOURCES} />
                    <SelectField label="Irrigation Type" value={form.irrigation_type} onChange={v => setForm(p => ({ ...p, irrigation_type: v }))} options={IRRIGATION_TYPES} />
                  </div>
                </div>

                {/* GPS */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Geospatial Data</p>
                    <button onClick={detectLocation} disabled={locating}
                      className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-black hover:text-emerald-700 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg transition border border-emerald-100 dark:border-emerald-800">
                      <Navigation size={14} /> {locating ? 'Detecting...' : 'Use My GPS Location'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Location (Village, Town, City) *</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={form.location_name} 
                          onChange={e => setForm(p => ({ ...p, location_name: e.target.value, latitude: '', longitude: '' }))} 
                          placeholder="e.g. Nashik, Maharashtra" 
                          className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition placeholder-gray-400 dark:placeholder-gray-600" 
                        />
                        <button 
                          onClick={handleSearchLocation} 
                          className="bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-5 rounded-xl font-bold transition text-sm whitespace-nowrap shadow-sm"
                          type="button"
                        >
                          Find on Map
                        </button>
                      </div>
                      {form.latitude && form.longitude && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">✓ Coordinates verified: {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Diagnostic Notes</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Any additional notes about this farm..."
                    rows={3}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none transition"
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 px-6 py-4 rounded-b-3xl flex gap-3 shrink-0">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition disabled:opacity-70 shadow-lg shadow-emerald-500/20">
                  {saving ? 'Syncing Location...' : editingFarm ? 'Update Telemetry' : 'Register Farm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FormField = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition placeholder-gray-400 dark:placeholder-gray-600" />
  </div>
);

const SelectField = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition">
      <option value="">Select...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export default FarmManager;
