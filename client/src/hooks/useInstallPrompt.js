import { useState, useEffect, useRef } from 'react';

const VISIT_COUNT_KEY = 'visitCount';
const DISMISSED_MILESTONES_KEY = 'installPromptDismissedMilestones';
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

function getDismissedMilestones() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_MILESTONES_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function setDismissedMilestone(milestone) {
  try {
    const milestones = getDismissedMilestones();
    milestones.add(milestone);
    localStorage.setItem(DISMISSED_MILESTONES_KEY, JSON.stringify([...milestones]));
  } catch { /* ignore */ }
}

export function useInstallPrompt() {
  const deferredPrompt = useRef(null);
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [visitCount, setVisitCountState] = useState(0);
  const installed = isStandalone();

  useEffect(() => {
    // Never prompt if already running as installed PWA
    if (installed) return;

    // Always detect iOS so install UI elsewhere (e.g. Disclaimer) is correct on every visit
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);

    // Increment visit count on each page load
    const newCount = getVisitCount() + 1;
    setVisitCount(newCount);
    setVisitCountState(newCount);

    // Show banner only at milestones that haven't been dismissed
    if (!PROMPT_VISITS.has(newCount) || getDismissedMilestones().has(newCount)) return;

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
    setDismissedMilestone(visitCount);
    setShouldShowPrompt(false);
  }

  async function triggerNativeInstall() {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    if (outcome === 'accepted') {
      setDismissedMilestone(visitCount);
    }
    setShouldShowPrompt(false);
  }

  return { shouldShowPrompt, isIos, visitCount, dismiss, triggerNativeInstall, isInstalled: installed };
}
