import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import Nav from './components/Nav.jsx';
import InstallBanner from './components/InstallBanner.jsx';
import MainCountdown from './pages/MainCountdown.jsx';
import Metadata from './pages/Metadata.jsx';
import Analytics from './pages/Analytics.jsx';
import { useTheme } from './hooks/useTheme.js';
import { useFerrySelector } from './hooks/useFerrySelector.js';
import { useInstallPrompt } from './hooks/useInstallPrompt.js';

function ErrorFallback() {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <p className="text-red-500 text-sm">Något gick fel. Ladda om sidan.</p>
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
          setFerry={setFerry}
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
              <Route path="/" element={<MainCountdown selectedSlug={selectedSlug} isIos={isIos} onInstall={triggerNativeInstall} isInstalled={isInstalled} />} />
              <Route path="/metadata" element={<Metadata selectedSlug={selectedSlug} selectedFerry={selectedFerry} isIos={isIos} onInstall={triggerNativeInstall} isInstalled={isInstalled} />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="*" element={
                <div className="flex-1 flex items-center justify-center px-6">
                  <p className="text-gray-400 dark:text-slate-500 text-sm">Sidan hittades inte.</p>
                </div>
              } />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}
