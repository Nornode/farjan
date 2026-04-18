import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import MainCountdown from './pages/MainCountdown.jsx';
import Metadata from './pages/Metadata.jsx';
import { useTheme } from './hooks/useTheme.js';
import { useFerrySelector } from './hooks/useFerrySelector.js';

export default function App() {
  const { dark, toggle } = useTheme();
  const { ferries, loading: ferriesLoading, selectedFerry, selectedSlug, setFerry } = useFerrySelector();

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
        <main className="flex-1 min-h-0 flex flex-col">
          <Routes>
            <Route path="/" element={<MainCountdown selectedSlug={selectedSlug} />} />
            <Route path="/metadata" element={<Metadata selectedSlug={selectedSlug} selectedFerry={selectedFerry} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
