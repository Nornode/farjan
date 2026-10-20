import { useState, useEffect, useCallback, useRef } from 'react';

export function useFerryData(slug) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const abortRef = useRef(null);

  const fetchData = useCallback(async (force = false) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    if (force) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const basePath = slug ? `/api/timetable/${slug}` : '/api/timetable';
      const url = force ? `${basePath}?refresh=true` : basePath;

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) detail = body.error;
        } catch { /* ignore */ }
        throw new Error(detail);
      }
      const json = await res.json();
      setData(json);
      setError(null);
      return json;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        throw err;
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [slug]);

  useEffect(() => {
    fetchData(false).catch(() => {});
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchData]);

  const refetch = useCallback((force = true) => fetchData(force), [fetchData]);

  return { data, error, loading, isRefreshing, refetch };
}
