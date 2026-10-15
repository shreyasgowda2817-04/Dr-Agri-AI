import { useState, useEffect } from 'react';
import { 
  Megaphone, Check, X, Pause, Play, Eye, 
  ExternalLink, Search, Filter, AlertTriangle, 
  TrendingUp, IndianRupee, MousePointerClick, Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';

const AdminAdsManagement = () => {
  const [analytics, setAnalytics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Rejection Modal State
  const [rejectingAd, setRejectingAd] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, campaignsRes] = await Promise.all([
        api.get('/ads/admin/analytics'),
        api.get(`/ads/admin/all?status=${statusFilter}&search=${encodeURIComponent(search)}`)
      ]);
      setAnalytics(analyticsRes.data);
      setCampaigns(campaignsRes.data || []);
    } catch (err) {
      toast.error('Failed to load advertising data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleUpdateStatus = async (adId, newStatus, reason = null) => {
    try {
      setActionLoading(true);
      await api.patch(`/ads/admin/${adId}/status`, {
        status: newStatus,
        rejection_reason: reason
      });
      toast.success(`Campaign marked as ${newStatus}`);
      if (rejectingAd) {
        setRejectingAd(null);
        setRejectReason('');
      }
      fetchData();
    } catch (err) {
      toast.error('Failed to update campaign status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-semibold text-gray-400 block mb-1">Total Campaigns</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white">{analytics?.total_campaigns ?? 0}</span>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm ${
          (analytics?.pending_count || 0) > 0 
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800' 
            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
        }`}>
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block mb-1">Pending Review</span>
          <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{analytics?.pending_count ?? 0}</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">Active Running</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{analytics?.active_count ?? 0}</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-semibold text-gray-400 block mb-1">Total Impressions</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white">{(analytics?.total_impressions ?? 0).toLocaleString()}</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-semibold text-gray-400 block mb-1">Total Clicks (CTR)</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white">{analytics?.average_ctr_percent ?? 0}%</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <span className="text-[11px] font-semibold text-gray-400 block mb-1">Ad Revenue</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white">₹{analytics?.total_spent_inr ?? 0}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search campaign or advertiser..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white font-medium"
          >
            <option value="all">All Campaigns</option>
            <option value="pending">Pending Review</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
            <p className="text-xs font-medium">No advertising campaigns match the current criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-4 font-semibold">Ad Creative</th>
                  <th className="py-3 px-4 font-semibold">Advertiser</th>
                  <th className="py-3 px-4 font-semibold">Placement</th>
                  <th className="py-3 px-4 font-semibold">Budget / Spent</th>
                  <th className="py-3 px-4 font-semibold">Performance</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.image_url}
                          alt={c.title}
                          onError={(e) => { e.target.style.display = 'none'; }}
                          className="w-12 h-12 rounded-xl object-cover bg-gray-100 flex-shrink-0 border"
                        />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{c.title}</p>
                          <p className="text-[11px] text-gray-500 line-clamp-1">{c.description}</p>
                          <a
                            href={c.destination_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <span>Target Link</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-800 dark:text-gray-200">{c.advertiser_name}</p>
                      <p className="text-[11px] text-gray-400">{c.advertiser_email || 'No email'}</p>
                    </td>

                    <td className="py-3.5 px-4 capitalize font-medium text-gray-700 dark:text-gray-300">
                      {c.placement}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900 dark:text-white">
                        ₹{c.spent_inr.toFixed(2)} <span className="text-gray-400 font-normal">/ ₹{c.budget_inr}</span>
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-gray-800 dark:text-gray-200">
                        {c.impressions_count.toLocaleString()} views • {c.clicks_count} clicks
                      </p>
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {c.ctr_percent}% CTR
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : c.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300'
                          : c.status === 'paused'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          : c.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {c.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(c.id, 'active')}
                              title="Approve Campaign"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              onClick={() => setRejectingAd(c)}
                              title="Reject Campaign"
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
                            >
                              <X size={12} /> Reject
                            </button>
                          </>
                        )}

                        {c.status === 'active' && (
                          <button
                            onClick={() => handleUpdateStatus(c.id, 'paused')}
                            title="Pause Campaign"
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
                          >
                            <Pause size={14} />
                          </button>
                        )}

                        {c.status === 'paused' && (
                          <button
                            onClick={() => handleUpdateStatus(c.id, 'active')}
                            title="Resume Campaign"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                          >
                            <Play size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingAd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
              Reject Campaign: {rejectingAd.title}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Please provide feedback explaining why this advertisement was rejected so the advertiser can rectify it.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Broken landing page link, or non-agricultural promotional product..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs mb-4"
            />

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setRejectingAd(null)}
                className="px-3.5 py-2 rounded-xl border font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleUpdateStatus(rejectingAd.id, 'rejected', rejectReason || 'Did not meet agricultural quality guidelines')}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 flex items-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAdsManagement;
