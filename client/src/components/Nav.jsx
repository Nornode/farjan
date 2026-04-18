import { NavLink } from 'react-router-dom';
import FerrySelector from './FerrySelector.jsx';

export default function Nav({ dark, onToggleTheme, ferries, selectedFerry, setFerry, ferriesLoading }) {
  const base = 'px-4 py-1 text-sm font-medium transition-colors rounded';
  const active = 'bg-white text-ferry-navy dark:bg-slate-600 dark:text-white underline underline-offset-2';
  const inactive = 'text-white hover:bg-white/20 dark:text-slate-300 dark:hover:bg-slate-700';

  return (
    <header className="bg-ferry-navy dark:bg-slate-800 text-white shadow-md transition-colors duration-200">
      <div className="w-full px-4 py-3 flex items-center justify-between">
        <FerrySelector
          ferries={ferries}
          selectedFerry={selectedFerry}
          setFerry={setFerry}
          loading={ferriesLoading}
        />

        <div className="flex items-center gap-1">
          <nav className="flex gap-1">
            <NavLink to="/" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
              Tidtabell
            </NavLink>
            <NavLink to="/metadata" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
              Info
            </NavLink>
          </nav>

          <button
            onClick={onToggleTheme}
            className="ml-2 w-8 h-8 flex items-center justify-center rounded-full text-base transition-colors bg-white/10 hover:bg-white/25 dark:bg-slate-700 dark:hover:bg-slate-600"
            title={dark ? 'Byt till ljust läge' : 'Byt till mörkt läge'}
            aria-label={dark ? 'Ljust läge' : 'Mörkt läge'}
          >
            {dark ? '☀' : '☾'}
          </button>
        </div>
      </div>
    </header>
  );
}
