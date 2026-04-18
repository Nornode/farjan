import { useState, useEffect } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      try { localStorage.setItem('theme', 'dark'); } catch { /* ignore */ }
    } else {
      root.classList.remove('dark');
      try { localStorage.setItem('theme', 'light'); } catch { /* ignore */ }
    }
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}
