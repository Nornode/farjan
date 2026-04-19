import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import Nav from './components/Nav.jsx';
import InstallBanner from './components/InstallBanner.jsx';
import MainCountdown from './pages/MainCountdown.jsx';
import Metadata from './pages/Metadata.jsx';
import Analytics from './pages/Analytics.jsx';
import { useTheme } from './hooks/useTheme.js';
import { useFerrySelector } from './hooks/useFerrySelector.js';
import { useInstallPrompt } from './hooks/useInstallPrompt.js';
import { normalizeToFerryId } from './utils/swedishVariants.js';

function ErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <p className="text-red-500 text-sm">Något gick fel. Ladda om sidan.</p>
    </div>
  );
}

/**
 * Dynamic Swedish variant redirect handler
 * Converts any Swedish character URL to ASCII canonical version
 * Handles all ferries with Swedish characters automatically
 */
function SwedishVariantRedirect() {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return <Navigate to="/" />;
  }

  const firstSegment = pathSegments[0];
  const restPath = pathSegments.slice(1);

  // Check if it's a Swedish variant
  const normalized = normalizeToFerryId(firstSegment);

  if (normalized && normalized !== firstSegment) {
    // Swedish variant - redirect to ASCII canonical
    const targetPath = restPath.length > 0
      ? `/${normalized}/${restPath.join('/')}`
      : `/${normalized}`;
    return <Navigate to={targetPath} />;
  }

  // Not a recognized variant, render 404
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <p className="text-gray-400 dark:text-slate-500 text-sm">Sidan hittades inte.</p>
    </div>
  );
}

export default function App() {
  const { dark, toggle } = useTheme();
  const { ferries, loading: ferriesLoading, selectedFerry, selectedSlug, setFerry } = useFerrySelector();
  const { shouldShowPrompt, isIos, visitCount, dismiss, triggerNativeInstall, isInstalled } = useInstallPrompt();

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-ferry-bg dark:bg-slate-900 overflow-hidden transition-colors duration-200">
        <Nav
          dark={dark}
          onToggleTheme={toggle}
          ferries={ferries}
          selectedFerry={selectedFerry}
          ferriesLoading={ferriesLoading}
        />
        {shouldShowPrompt && (
          <InstallBanner
            visitCount={visitCount}
            isIos={isIos}
            onInstall={triggerNativeInstall}
            onDismiss={dismiss}
          />
        )}
        <main className="flex-1 min-h-0 flex flex-col">
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Routes>
              {/* Default route for Skåldö */}
              <Route path="/" element={<MainCountdown selectedSlug={selectedSlug} isIos={isIos} onInstall={triggerNativeInstall} isInstalled={isInstalled} />} />

              {/* Ferry-specific countdown routes (ASCII canonical) */}
              <Route path="/:ferrySlug" element={<MainCountdown selectedSlug={selectedSlug} isIos={isIos} onInstall={triggerNativeInstall} isInstalled={isInstalled} />} />

              {/* Ferry-specific metadata routes */}
              <Route path="/:ferrySlug/metadata" element={<Metadata selectedSlug={selectedSlug} selectedFerry={selectedFerry} isIos={isIos} onInstall={triggerNativeInstall} isInstalled={isInstalled} />} />

              {/* Backward-compat redirect for old /metadata route */}
              <Route path="/metadata" element={<Navigate to="/skaldo/metadata" />} />

              {/* Analytics dashboard */}
              <Route path="/analytics" element={<Analytics />} />

              {/* Redirect ASCII-only alias for Skåldö */}
              <Route path="/skalo" element={<Navigate to="/skaldo" />} />

              {/* Dynamic catch-all: handles Swedish character variants, 404s, etc. */}
              <Route path="*" element={<SwedishVariantRedirect />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}
