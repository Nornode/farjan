import { useState, useEffect, useRef } from 'react';

const VISIT_COUNT_KEY = 'visitCount';
const DISMISSED_KEY = 'installPromptDismissed';
const PROMPT_VISITS = new Set([3, 10, 20, 50]);

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true
  );
}

function getVisitCount() {
  try {
    return parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function setVisitCount(count) {
  try {
    localStorage.setItem(VISIT_COUNT_KEY, String(count));
  } catch { /* ignore */ }
}

function isDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, 'true');
  } catch { /* ignore */ }
}

export function useInstallPrompt() {
  const deferredPrompt = useRef(null);
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Never prompt if already running as installed PWA
    if (isStandalone()) return;

    // Increment visit count on each page load
    const newCount = getVisitCount() + 1;
    setVisitCount(newCount);

    if (isDismissed() || !PROMPT_VISITS.has(newCount)) return;

    // Detect iOS Safari (no beforeinstallprompt support)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);
    setShouldShowPrompt(true);
  }, []);

  useEffect(() => {
    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      deferredPrompt.current = e;
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setDismissed();
    setShouldShowPrompt(false);
  }

  async function triggerNativeInstall() {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    if (outcome === 'accepted') {
      setDismissed();
    }
    setShouldShowPrompt(false);
  }

  return { shouldShowPrompt, isIos, dismiss, triggerNativeInstall };
}
