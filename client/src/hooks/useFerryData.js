import { useState, useEffect, useCallback } from 'react';

export function useFerryData(slug) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchCount, setFetchCount] = useState(0);

  const refetch = useCallback(() => setFetchCount((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const url = slug ? `/api/timetable/${slug}` : '/api/timetable';

    fetch(url)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((json) => { if (!cancelled) { setData(json); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [slug, fetchCount]);

  return { data, error, loading, refetch };
}
