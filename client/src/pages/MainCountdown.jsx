import { useFerryData } from '../hooks/useFerryData.js';
import Countdown from '../components/Countdown.jsx';
import Disclaimer from '../components/Disclaimer.jsx';

export default function MainCountdown({ selectedSlug, isIos, onInstall, isInstalled }) {
  const { data, error, loading } = useFerryData(selectedSlug);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-ferry-blue animate-pulse text-sm">Laddar tidtabell…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-1">
          <p className="text-red-500 font-semibold text-sm">Kunde inte hämta tidtabell</p>
          {error && <p className="text-gray-500 dark:text-slate-400 text-xs">{error}</p>}
          <p className="text-gray-400 dark:text-slate-500 text-xs">Kontrollera anslutningen eller försök igen senare.</p>
        </div>
      </div>
    );
  }

  const { timetables, metadata } = data;
  const breaks = metadata?.breaks ?? [];

  const island = timetables?.island;
  const mainland = timetables?.mainland;

  // Format last-update time in Helsinki timezone as YYYY-MM-DD HH:MM
  const lastUpdated = metadata?.lastScrapedAt
    ? new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Helsinki',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(metadata.lastScrapedAt))
    : null;

  // Use terminal location names from the data if they differ from Skåldö defaults
  const islandLabel = island?.location?.toLowerCase().includes('saari') || island?.location?.toLowerCase().includes('ö)')
    ? { pre: 'Från', main: 'ön', post: 'om' }
    : { pre: 'Från', main: island?.location ?? 'ön', post: 'om' };

  const mainlandLabel = mainland?.location?.toLowerCase().includes('mantere') || mainland?.location?.toLowerCase().includes('fastland')
    ? { pre: 'Från', main: 'fastlandet', post: 'om' }
    : { pre: 'Från', main: mainland?.location ?? 'fastlandet', post: 'om' };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Two horizontal rows, one per terminal */}
      <div className="flex flex-col flex-1 min-h-0 divide-y divide-ferry-border dark:divide-slate-700">
        <Countdown
          label={islandLabel}
          departures={island?.departures}
          breaks={breaks}
        />
        <Countdown
          label={mainlandLabel}
          departures={mainland?.departures}
          breaks={breaks}
        />
      </div>

      {/* Footer: last update · disclaimer · validity */}
      <div className="border-t border-ferry-border dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 px-4 py-2 grid grid-cols-3 items-center">
        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
          {lastUpdated ? `Uppdaterad ${lastUpdated}` : ''}
        </p>
        <div className="flex justify-center">
          <Disclaimer isIos={isIos} onInstall={onInstall} isInstalled={isInstalled} />
        </div>
        <p className="text-xs truncate text-right">
          {metadata?.scraperStatus === 'error'
            ? <span className="text-red-400">Skrapning misslyckades</span>
            : <span className="text-gray-400 dark:text-slate-500">{metadata?.validityFrom ? `Giltig fr.o.m. ${metadata.validityFrom}` : ''}</span>}
        </p>
      </div>
    </div>
  );
}
