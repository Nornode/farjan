import { useFerryData } from '../hooks/useFerryData.js';
import Countdown from '../components/Countdown.jsx';

export default function MainCountdown() {
  const { data, error, loading } = useFerryData();

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
        <div className="text-center">
          <p className="text-red-500 font-semibold text-sm">Kunde inte hämta tidtabell</p>
          <p className="text-gray-400 text-xs mt-1">{error}</p>
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

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Two horizontal rows, one per terminal */}
      <div className="flex flex-col flex-1 min-h-0 divide-y divide-ferry-border dark:divide-slate-700">
        <Countdown
          label={{ pre: 'Från', main: 'ön', post: 'om' }}
          departures={island?.departures}
          breaks={breaks}
        />
        <Countdown
          label={{ pre: 'Från', main: 'fastlandet', post: 'om' }}
          departures={mainland?.departures}
          breaks={breaks}
        />
      </div>

      {/* Footer: last update + scraper status */}
      <div className="border-t border-ferry-border dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 px-4 py-2 flex items-center justify-between">
        {lastUpdated && (
          <p className="text-xs text-gray-400 dark:text-slate-500">Uppdaterad {lastUpdated}</p>
        )}
        {metadata?.scraperStatus === 'error' && (
          <p className="text-xs text-red-400">Skrapning misslyckades</p>
        )}
        {metadata?.validityFrom && (
          <p className="text-xs text-gray-400 dark:text-slate-500">Giltig fr.o.m. {metadata.validityFrom}</p>
        )}
      </div>
    </div>
  );
}
