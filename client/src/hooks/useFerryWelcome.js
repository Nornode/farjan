import { useState } from 'react';

const LS_KEY = 'farjan_ferry_welcomed';

function hasBeenWelcomed() {
  try { return !!localStorage.getItem(LS_KEY); } catch { return false; }
}

function markWelcomed() {
  try { localStorage.setItem(LS_KEY, '1'); } catch { /* ignore */ }
}

export function useFerryWelcome() {
  const [visible, setVisible] = useState(() => !hasBeenWelcomed());

  function dismiss() {
    markWelcomed();
    setVisible(false);
  }

  return { visible, dismiss };
}
