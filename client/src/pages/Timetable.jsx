import { useParams, Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useFerryData } from '../hooks/useFerryData.js';
import { useFerrySelector } from '../hooks/useFerrySelector.js';
import { getHelsinkiNow, toSeconds, depToSeconds } from '../hooks/timeUtils.js';

export default function Timetable({ selectedSlug }) {
  const { ferrySlug, direction } = useParams();
  const { selectedFerry } = useFerrySelector();
  const { data, loading, error } = useFerryData(selectedSlug);
  const highlightRef = useRef(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [data]);

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
        <p className="text-red-500 text-sm">Kunde inte hämta tidtabell</p>
      </div>
    );
  }

  const { timetables } = data;
  const isIsland = direction === 'on';
  const terminal = isIsland ? timetables?.island : timetables?.mainland;
  const departures = terminal?.departures ?? [];
  const locationName = terminal?.location ?? (isIsland ? 'Ön' : 'Fastlandet');

  const now = getHelsinkiNow();
  const nowSec = toSeconds(now);

  let nextIdx = -1;
  for (let i = 0; i < departures.length; i++) {
    if (depToSeconds(departures[i]) >= nowSec) {
      nextIdx = i;
      break;
    }
  }

  const ferryId = ferrySlug || 'skaldo';

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
      <div className="px-4 pt-5 pb-3 sticky top-0 bg-ferry-bg dark:bg-slate-900 z-10 border-b border-ferry-border dark:border-slate-700">
        <Link
          to={`/${ferryId}`}
          className="text-xs text-ferry-blue dark:text-blue-400 hover:underline"
        >
          ← Tillbaka
        </Link>
        <h1 className="text-lg font-bold text-ferry-navy dark:text-white mt-1">
          {locationName}
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Nästa avgång markerad
        </p>
      </div>

      <div className="flex-1 px-4 py-3">
        <ul className="space-y-1">
          {departures.map((dep, i) => {
            const isPast = nextIdx >= 0 ? i < nextIdx : depToSeconds(dep) < nowSec;
            const isNext = i === nextIdx;

            return (
              <li
                key={dep + i}
                ref={isNext ? highlightRef : undefined}
                className={[
                  'flex items-center rounded-lg px-4 py-3 transition-colors',
                  isNext
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-ferry-blue dark:border-blue-400'
                    : isPast
                    ? 'opacity-40'
                    : 'border-l-4 border-transparent',
                ].join(' ')}
              >
                <span
                  className={[
                    'text-2xl font-semibold tabular-nums',
                    isNext
                      ? 'text-ferry-navy dark:text-white'
                      : 'text-gray-700 dark:text-slate-300',
                  ].join(' ')}
                >
                  {dep}
                </span>
                {isNext && (
                  <span className="ml-3 text-xs font-medium bg-ferry-blue dark:bg-blue-600 text-white rounded-full px-2 py-0.5">
                    Nästa
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
