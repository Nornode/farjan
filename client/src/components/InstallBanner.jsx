export default function InstallBanner({ isIos, onInstall, onDismiss }) {
  return (
    <div
      role="banner"
      className="relative z-40 bg-ferry-navy dark:bg-slate-800 text-white px-4 py-3 flex items-center justify-between gap-3 text-sm shadow-md"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base shrink-0" aria-hidden="true">📱</span>
        {isIos ? (
          <span className="leading-snug">
            Lägg till på hemskärmen: tryck på{' '}
            <span className="font-semibold">Dela</span>{' '}
            och välj{' '}
            <span className="font-semibold">Lägg till på hemskärmen</span>.
          </span>
        ) : (
          <span className="leading-snug">
            Lägg till på hemskärmen för snabb åtkomst.
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isIos && onInstall && (
          <button
            onClick={onInstall}
            className="px-3 py-1 rounded-full bg-white text-ferry-navy font-semibold text-xs hover:bg-ferry-light transition-colors"
          >
            Installera
          </button>
        )}
        <button
          onClick={onDismiss}
          className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 dark:hover:bg-slate-700 transition-colors text-base leading-none"
          aria-label="Stäng"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
