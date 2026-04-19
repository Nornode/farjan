import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function FerrySelector({ ferries, selectedFerry, loading }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { ferrySlug } = useParams();

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('touchstart', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const displayName = selectedFerry?.name ?? (loading ? '…' : 'Välj färja');

  const handleSelectFerry = (ferryId) => {
    // Store preference in localStorage
    try { localStorage.setItem('farjan_ferry', ferryId); } catch { /* ignore */ }
    // Navigate to ferry route
    navigate(`/${ferryId}`);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-base font-bold tracking-wide text-white hover:text-white/80 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {displayName}
        <span className={`text-xs transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1 z-50 w-64 max-h-[70vh] overflow-y-auto rounded-lg shadow-xl bg-white dark:bg-slate-800 border border-ferry-border dark:border-slate-600"
        >
          {loading ? (
            <p className="px-4 py-3 text-sm text-gray-400 animate-pulse">Laddar ferrylista…</p>
          ) : ferries.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Inga färjor tillgängliga</p>
          ) : (
            ferries.map((ferry) => {
              const isSelected = ferry.id === selectedFerry?.id;
              return (
                <button
                  key={ferry.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectFerry(ferry.id)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                    ${isSelected
                      ? 'bg-ferry-blue/10 dark:bg-blue-900/30 text-ferry-navy dark:text-blue-300 font-semibold'
                      : 'text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                >
                  {ferry.name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
