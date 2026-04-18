import { useState } from 'react';

export default function Disclaimer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 dark:text-slate-500 hover:text-ferry-blue dark:hover:text-blue-300 transition-colors underline underline-offset-2"
        aria-label="Visa ansvarsfriskrivning"
      >
        ⓘ Om tjänsten
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl shadow-2xl bg-white dark:bg-slate-800 border border-ferry-border dark:border-slate-600 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-400 dark:text-slate-500 hover:text-ferry-navy dark:hover:text-white transition-colors text-lg leading-none"
              aria-label="Stäng"
            >
              ✕
            </button>

            <h2 className="text-base font-bold text-ferry-navy dark:text-white mb-4">
              Om tjänsten
            </h2>

            <div className="space-y-3 text-sm text-gray-600 dark:text-slate-300">
              <p>
                Denna tjänst är ett <span className="font-semibold text-ferry-navy dark:text-white">oberoende, icke-kommersiellt projekt</span> utan anknytning till Finferries, Traficom eller finska staten.
              </p>
              <p>
                Tidtabellsdata hämtas från <span className="font-medium">finferries.fi</span> och kan innehålla fel eller avvikelser. Använd alltid officiella källor för reseplanering. Tjänsten tillhandahålls i befintligt skick utan garantier av något slag.
              </p>
              <p>
                Helt utvecklad av AI —{' '}
                <span className="font-medium text-ferry-navy dark:text-white">Claude (claude-sonnet-4-6)</span>
                {' '}av Anthropic, via IDE{' '}
                <span className="font-medium text-ferry-navy dark:text-white">Claude Code</span>.
              </p>

              <div className="pt-2 border-t border-ferry-border dark:border-slate-700">
                <a
                  href="https://github.com/Nornode"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-ferry-blue dark:text-blue-300 hover:underline font-medium"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  github.com/Nornode
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
