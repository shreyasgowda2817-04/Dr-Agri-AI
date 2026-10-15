import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Megaphone, Plus, TrendingUp, Eye, MousePointerClick, 
  IndianRupee, Pause, Play, Trash2, ExternalLink, AlertCircle, 
  CheckCircle2, Clock, X, Image as ImageIcon, Sparkles, Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';

const AdvertiserDashboard = () => {
  const { user } = useSelector((state) => state.auth);

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewAd, setPreviewAd] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    destination_url: '',
    call_to_action: 'Learn More',
    placement: 'all',
    budget_inr: 500,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ads/my-campaigns');
      setCampaigns(res.data || []);
    } catch (err) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!form.title || !form.destination_url || !form.image_url) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        budget_inr: Number(form.budget_inr),
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString()
      };

      await api.post('/ads/campaigns', payload);
      toast.success('🎉 Campaign submitted! It is now pending admin approval.');
      setShowCreateModal(false);
      setForm({
        title: '',
        description: '',
        image_url: '',
        destination_url: '',
        call_to_action: 'Learn More',
        placement: 'all',
        budget_inr: 500,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      fetchCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePause = async (campaign) => {
    try {
      if (campaign.status === 'active') {
        await api.patch(`/ads/campaigns/${campaign.id}/pause`);
        toast.info('Campaign paused');
      } else if (campaign.status === 'paused') {
        await api.patch(`/ads/campaigns/${campaign.id}/resume`);
        toast.success('Campaign resumed');
      }
      fetchCampaigns();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await api.delete(`/ads/campaigns/${campaignId}`);
      toast.success('Campaign removed');
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (err) {
      toast.error('Failed to delete campaign');
    }
  };

  // KPI Computations
  const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions_count || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks_count || 0), 0);
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent_inr || 0), 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
  const activeCount = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-emerald-600" />
            Advertiser Portal
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Promote agricultural products, seeds, tools, and services directly to thousands of verified farmers.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition active:scale-95"
        >
          <Plus size={16} /> Create Campaign
        </button>
      </div>

      {/* KPI Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Active Campaigns</span>
            <Sparkles size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{activeCount}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Total Impressions</span>
            <Eye size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{totalImpressions.toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Total Clicks</span>
            <MousePointerClick size={16} className="text-teal-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{totalClicks.toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Average CTR</span>
            <TrendingUp size={16} className="text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{overallCtr}%</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Total Spend</span>
            <IndianRupee size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">₹{totalSpent.toFixed(2)}</p>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">My Campaigns</h3>
          <span className="text-xs text-gray-400">{campaigns.length} total</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-gray-400">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-600" />
            <p className="text-sm font-semibold">No advertising campaigns created yet.</p>
            <p className="text-xs mt-1 text-gray-400">Click "Create Campaign" to submit your first sponsored agricultural ad.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-4 font-semibold">Campaign</th>
                  <th className="py-3 px-4 font-semibold">Placement</th>
                  <th className="py-3 px-4 font-semibold">Budget & Spend</th>
                  <th className="py-3 px-4 font-semibold">Impressions</th>
                  <th className="py-3 px-4 font-semibold">Clicks</th>
                  <th className="py-3 px-4 font-semibold">CTR</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {campaigns.map((c) => {
                  const spendPercent = Math.min(100, (c.spent_inr / (c.budget_inr || 1)) * 100);

                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={c.image_url}
                            alt={c.title}
                            onError={(e) => { e.target.style.display = 'none'; }}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100 flex-shrink-0 border"
                          />
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{c.title}</p>
                            <p className="text-[11px] text-gray-400 line-clamp-1">{c.description}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 capitalize font-medium text-gray-700 dark:text-gray-300">
                        {c.placement}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900 dark:text-white">
                          ₹{c.spent_inr.toFixed(2)} <span className="text-gray-400 font-normal">/ ₹{c.budget_inr}</span>
                        </p>
                        <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${spendPercent}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-gray-800 dark:text-gray-200">
                        {c.impressions_count.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-gray-800 dark:text-gray-200">
                        {c.clicks_count.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {c.ctr_percent}%
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          c.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : c.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : c.status === 'paused'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            : c.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {c.status}
                        </span>
                        {c.rejection_reason && (
                          <p className="text-[10px] text-rose-500 mt-0.5 line-clamp-1" title={c.rejection_reason}>
                            Reason: {c.rejection_reason}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(c.status === 'active' || c.status === 'paused') && (
                            <button
                              onClick={() => handleTogglePause(c)}
                              title={c.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            >
                              {c.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          )}
                          <button
                            onClick={() => setPreviewAd(c)}
                            title="Preview Ad"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            title="Delete Campaign"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaign Submission Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 my-8">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus size={18} className="text-emerald-600" />
                Submit New Advertisement
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Campaign Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bio-NPK Organic Growth Booster 1L"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Description *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Short, compelling value proposition for farmers..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Image URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/ad-banner.jpg"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Destination URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://yourstore.com/product"
                    value={form.destination_url}
                    onChange={(e) => setForm({ ...form, destination_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">CTA Label</label>
                  <input
                    type="text"
                    value={form.call_to_action}
                    onChange={(e) => setForm({ ...form, call_to_action: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Placement</label>
                  <select
                    value={form.placement}
                    onChange={(e) => setForm({ ...form, placement: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Placements</option>
                    <option value="dashboard">Farmer Dashboard</option>
                    <option value="marketplace">Marketplace</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Budget (INR) *</label>
                  <input
                    type="number"
                    min={50}
                    step={50}
                    required
                    value={form.budget_inr}
                    onChange={(e) => setForm({ ...form, budget_inr: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-300">End Date</label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                Campaigns must be reviewed by platform administrators before going live. Ads are shown only to free users and are 100% hidden from paying premium farmers.
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ad Preview Modal */}
      {previewAd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase">Live Farmer Preview</span>
              <button onClick={() => setPreviewAd(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="rounded-2xl border border-amber-300 dark:border-amber-800/60 p-4 bg-amber-50/30 dark:bg-amber-950/20">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300">
                  Sponsored
                </span>
                <span className="text-[10px] text-gray-500">by {previewAd.advertiser_name}</span>
              </div>

              <img
                src={previewAd.image_url}
                alt={previewAd.title}
                className="w-full h-36 object-cover rounded-xl mb-3 border bg-gray-100"
              />

              <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1">
                {previewAd.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                {previewAd.description}
              </p>

              <button className="w-full py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1">
                <span>{previewAd.call_to_action || 'Learn More'}</span>
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvertiserDashboard;
