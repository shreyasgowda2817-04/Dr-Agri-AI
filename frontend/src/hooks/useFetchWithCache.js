import { useState, useEffect } from 'react';
import api from '../services/api';

// Global cache map to persist data across route changes
const globalCache = new Map();

export default function useFetchWithCache(url, defaultValue = null) {
  // If data is in cache, return it immediately to prevent UI skeletons
  const cachedData = globalCache.get(url);
  const [data, setData] = useState(cachedData !== undefined ? cachedData : defaultValue);
  const [loading, setLoading] = useState(cachedData === undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    // Background stale-while-revalidate fetch
    api.get(url)
      .then(res => {
        if (isMounted) {
          const result = res.data;
          
          // Only trigger re-render if data actually changed to prevent React cascading renders
          if (JSON.stringify(globalCache.get(url)) !== JSON.stringify(result)) {
            globalCache.set(url, result);
            setData(result);
          }
          setLoading(false);
          setError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error(`Error fetching ${url}:`, err);
          setError(err);
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [url]);

  return { data, loading, error };
}
