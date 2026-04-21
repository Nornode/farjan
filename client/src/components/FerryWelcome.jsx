export default function FerryWelcome({ onChoose, onContinue }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        onClick={onContinue}
        aria-hidden="true"
      />

      {/* Centred card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-xs">

          {/* Arrow pointing up toward the nav */}
          <div className="flex justify-start pl-6">
            <div className="w-0 h-0
              border-l-[10px] border-r-[10px] border-b-[13px]
              border-l-transparent border-r-transparent
              border-b-white dark:border-b-slate-800" />
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl px-6 py-5 text-center">
            <div className="text-3xl mb-3" aria-hidden="true">⛴</div>

            <h2 className="text-ferry-navy dark:text-white font-bold text-lg mb-2 leading-snug">
              Vilken färja tar du?
            </h2>

            <p className="text-gray-500 dark:text-slate-400 text-sm mb-5 leading-relaxed">
              Tryck på{' '}
              <span className="font-semibold text-ferry-navy dark:text-slate-200">
                Skåldö Färjan
              </span>{' '}
              uppe till vänster för att byta till din färja.
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={onChoose}
                className="w-full py-2.5 rounded-xl bg-ferry-blue text-white font-semibold text-sm hover:bg-ferry-navy transition-colors"
              >
                Välj din färja ↑
              </button>
              <button
                onClick={onContinue}
                className="w-full py-2 rounded-xl text-gray-500 dark:text-slate-400 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                Fortsätt med Skåldö Färjan
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
