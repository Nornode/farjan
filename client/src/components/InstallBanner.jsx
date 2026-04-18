// Natural, non-pushy messages keyed by visit milestone.
// Each milestone has a few variants; one is picked based on visit count mod.
const MESSAGES = {
  3: [
    'Verkar som du hittar hit ofta — visste du att du kan spara sidan på hemskärmen?',
    'Tredje gången gillt! Det går snabbare att öppna om du lägger till den på hemskärmen.',
    'Du har hittat hit några gånger nu. Hemskärmen är ett klick snabbare.',
  ],
  10: [
    'Det här är tionde gången du tittar in — det är lättare att hitta från hemskärmen.',
    'Tionde besöket! Du verkar gilla färjan. Spara den på hemskärmen så är den alltid nära.',
    'Tio gånger hit — lite enklare med en ikon på hemskärmen, eller hur?',
  ],
  20: [
    'Tjugonde besöket — du är nästan en stamgäst. Hemskärmsikonen sparar dig ett par klick.',
    'Tjugo gånger! Det är värt att ha den på hemskärmen vid det här laget.',
    'Du hittar tydligt hit ofta. En genväg på hemskärmen gör det ännu smidigare.',
  ],
  50: [
    'Femtio besök — imponerande! Den förtjänar nog en plats på hemskärmen.',
    'Halvvägs till hundra besök. Hemskärmsgenvägen väntar fortfarande på dig.',
    'Femtionde gången — du är en riktig färjefantast. Ta den med dig på hemskärmen!',
  ],
};

const IOS_SUFFIX = ' Tryck på Dela och välj "Lägg till på hemskärmen".';

function getMessage(visitCount, isIos) {
  const milestones = [3, 10, 20, 50];
  const milestone = milestones.find((m) => visitCount <= m) ?? 50;
  const variants = MESSAGES[milestone];
  const text = variants[visitCount % variants.length];
  return isIos ? text + IOS_SUFFIX : text;
}

export default function InstallBanner({ visitCount, isIos, onInstall, onDismiss }) {
  const message = getMessage(visitCount, isIos);

  return (
    <div
      role="banner"
      className="relative z-40 bg-ferry-navy dark:bg-slate-800 text-white px-4 py-3 flex items-center justify-between gap-3 text-sm shadow-md"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base shrink-0" aria-hidden="true">📱</span>
        <span className="leading-snug">{message}</span>
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
