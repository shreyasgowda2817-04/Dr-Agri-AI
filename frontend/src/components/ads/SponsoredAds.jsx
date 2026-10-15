import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ExternalLink, Sparkles, Megaphone, ShieldCheck, Tag } from 'lucide-react';
import api from '../../services/api';

const SponsoredAds = ({ 
  placement = 'all', 
  layout = 'card', // 'card', 'banner', 'compact'
  className = '' 
}) => {
  const { user } = useSelector((state) => state.auth);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState({});
  const impressionLoggedRef = useRef(new Set());

  // 1. Strictly enforce Ad-Free experience for Premium subscribers
  const isPremiumUser = Boolean(
    user?.is_premium || 
    user?.tier === 'pro' || 
    user?.tier === 'premium' ||
    user?.subscription?.status === 'active'
  );

  useEffect(() => {
    // If premium, never fetch ads or register impressions
    if (isPremiumUser) {
      setLoading(false);
      setAds([]);
      return;
    }

    let isMounted = true;
    const fetchAds = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/ads/public?placement=${encodeURIComponent(placement)}`);
        if (isMounted) {
          setAds(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (isMounted) setAds([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAds();
    return () => { isMounted = false; };
  }, [placement, isPremiumUser]);

  // 2. Track impression once per ad when loaded (anti-fraud debounced)
  useEffect(() => {
    if (isPremiumUser || !ads.length) return;

    ads.forEach((ad) => {
      if (!impressionLoggedRef.current.has(ad.id)) {
        impressionLoggedRef.current.add(ad.id);
        api.post(`/ads/${ad.id}/impression`).catch(() => {});
      }
    });
  }, [ads, isPremiumUser]);

  // 3. Track Click
  const handleAdClick = (ad) => {
    if (isPremiumUser) return;
    api.post(`/ads/${ad.id}/click`).catch(() => {});
    if (ad.destination_url) {
      window.open(ad.destination_url, '_blank', 'noopener,noreferrer');
    }
  };

  // If premium, return null with zero DOM footprint
  if (isPremiumUser) return null;

  // Loading skeleton
  if (loading) {
    return (
      <div className={`animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800/50 p-4 border border-gray-200/60 dark:border-gray-700/60 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3" />
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  // If no ads available for this placement
  if (!ads.length) return null;

  // Banner layout (wide horizontal strip)
  if (layout === 'banner') {
    const ad = ads[0];
    const hasImageError = imgError[ad.id];

    return (
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 dark:from-amber-950/30 dark:via-emerald-950/30 dark:to-teal-950/30 border border-amber-200/80 dark:border-amber-800/40 p-4 sm:p-5 shadow-sm transition hover:shadow-md ${className}`}>
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-between">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center shadow-inner">
              {ad.image_url && !hasImageError ? (
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  onError={() => setImgError(prev => ({ ...prev, [ad.id]: true }))}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Megaphone className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  Sponsored
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  by {ad.advertiser_name}
                </span>
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white leading-snug line-clamp-1">
                {ad.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 mt-0.5">
                {ad.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleAdClick(ad)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <span>{ad.call_to_action || 'Learn More'}</span>
              <ExternalLink size={13} />
            </button>
            <Link
              to="/subscription/plans"
              title="Remove ads with Premium"
              className="text-[11px] text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition underline whitespace-nowrap"
            >
              Ad-Free?
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Card layout (Standard grid card or sidebar widget)
  return (
    <div className={`space-y-4 ${className}`}>
      {ads.map((ad) => {
        const hasImageError = imgError[ad.id];
        return (
          <div
            key={ad.id}
            className="group relative rounded-2xl bg-white dark:bg-gray-800 border border-amber-200/70 dark:border-amber-900/40 p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
          >
            {/* Top header badge */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  <Tag size={10} /> Sponsored
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate max-w-[140px]">
                  {ad.advertiser_name}
                </span>
              </div>
              <Link
                to="/subscription/plans"
                className="text-[10px] text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
              >
                Hide Ads
              </Link>
            </div>

            {/* Creative Image */}
            <div className="relative w-full h-32 sm:h-36 rounded-xl overflow-hidden bg-gradient-to-br from-amber-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-3">
              {ad.image_url && !hasImageError ? (
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  onError={() => setImgError(prev => ({ ...prev, [ad.id]: true }))}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-amber-600 dark:text-amber-400">
                  <Megaphone className="w-8 h-8 mb-1 opacity-80" />
                  <span className="text-[10px] uppercase font-semibold tracking-wider">Verified Agri Partner</span>
                </div>
              )}
            </div>

            {/* Content info */}
            <div className="flex-1 mb-3">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                {ad.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                {ad.description}
              </p>
            </div>

            {/* Action CTA */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <button
                onClick={() => handleAdClick(ad)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition active:scale-98"
              >
                <span>{ad.call_to_action || 'Explore Product'}</span>
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SponsoredAds;
