import { useState, useEffect, useMemo } from 'react';

const LS_KEY = 'farjan_ferry';
const DEFAULT_FERRY_ID = 'skaldo';

function getHelsinkiDay() {
  // Returns 0=Sun, 1=Mon, ..., 6=Sat in Helsinki timezone
  const short = new Date().toLocaleDateString('en-US', {
    timeZone: 'Europe/Helsinki',
    weekday: 'short',
  });
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[short] ?? new Date().getDay();
}

function getHelsinkiMonth() {
  return parseInt(
    new Date().toLocaleDateString('en-US', { timeZone: 'Europe/Helsinki', month: 'numeric' }),
    10
  );
}

function pickVariant(variants) {
  if (!variants?.length) return null;
  if (variants.length === 1) return variants[0];

  const day = getHelsinkiDay();
  const month = getHelsinkiMonth();
  const isSummer = month >= 5 && month <= 9;

  const order = [];
  if (day >= 1 && day <= 5) order.push('mon-fri');
  if (day === 6) order.push('sat', 'sat-sun');
  if (day === 0) order.push('sun', 'sat-sun');
  order.push(isSummer ? 'summer' : 'winter');
  order.push('all');

  for (const pattern of order) {
    const found = variants.find((v) => v.dayPattern === pattern);
    if (found) return found;
  }
  return variants[0];
}

export function useFerrySelector() {
  const [ferries, setFerries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(() => {
    try { return localStorage.getItem(LS_KEY) || DEFAULT_FERRY_ID; } catch { return DEFAULT_FERRY_ID; }
  });

  useEffect(() => {
    fetch('/api/ferries')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => setFerries(data.ferries ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedFerry = useMemo(
    () => ferries.find((f) => f.id === selectedId) ?? null,
    [ferries, selectedId]
  );

  const selectedVariant = useMemo(() => pickVariant(selectedFerry?.variants), [selectedFerry]);

  function setFerry(id) {
    setSelectedId(id);
    try { localStorage.setItem(LS_KEY, id); } catch { /* ignore */ }
  }

  return {
    ferries,
    loading,
    error,
    selectedFerry,
    selectedSlug: selectedVariant?.slug ?? null,
    setFerry,
  };
}
