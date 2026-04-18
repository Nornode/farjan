import { useState, useEffect, useCallback } from 'react';

export function useFerryData(slug) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = useCallback(() => setFetchCount((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const url = slug ? `/api/timetable/${slug}` : '/api/timetable';

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try { const body = await res.json(); if (body?.error) detail = body.error; } catch { /* ignore */ }
          throw new Error(detail);
        }
        return res.json();
      })
      .then((json) => { setData(json); setError(null); })
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [slug, fetchCount]);

  return { data, error, loading, refetch };
}
