import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav.jsx';
import MainCountdown from './pages/MainCountdown.jsx';
import Metadata from './pages/Metadata.jsx';
import { useTheme } from './hooks/useTheme.js';

export default function App() {
  const { dark, toggle } = useTheme();

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-ferry-bg dark:bg-slate-900 overflow-hidden transition-colors duration-200">
        <Nav dark={dark} onToggleTheme={toggle} />
        <main className="flex-1 min-h-0 flex flex-col">
          <Routes>
            <Route path="/" element={<MainCountdown />} />
            <Route path="/metadata" element={<Metadata />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
