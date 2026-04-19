import { useEffect, useRef } from 'react';

function viewportBucket(width) {
  if (width < 480) return '<480';
  if (width < 768) return '480-767';
  if (width < 1200) return '768-1199';
  return '1200+';
}

function ttiBucket() {
  try {
    const entries = performance.getEntriesByType?.('navigation');
    let ms;
    if (entries?.length > 0) {
      ms = entries[0].domContentLoadedEventEnd - entries[0].startTime;
    } else if (performance.timing) {
      ms = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
    }
    if (ms != null && ms > 0) {
      if (ms < 500) return '<500ms';
      if (ms < 1000) return '500ms-1s';
      if (ms < 3000) return '1s-3s';
      return '>3s';
    }
  } catch {
    // ignore — performance API not available
  }
  return null;
}

// Fires a single fire-and-forget beacon on first mount, collecting only
// non-personal, non-identifying environment data.
export function useAnalyticsBeacon() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const payload = {
      viewport: viewportBucket(window.innerWidth),
      colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
      connectionType: navigator.connection?.effectiveType ?? null,
      ttiBucket: ttiBucket(),
    };

    fetch('/api/beacon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, []);
}
