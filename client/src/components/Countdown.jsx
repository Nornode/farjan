import { useState, useEffect, useRef } from 'react';
import {
  getHelsinkiNow,
  toSeconds,
  depToSeconds,
  resolveWithBreaks,
  formatCountdownParts,
  formatMMSS,
} from '../hooks/timeUtils.js';

export default function Countdown({ label, departures, breaks }) {
  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (!departures?.length) {
    return (
      <div className="flex-1 flex items-center px-6 py-4">
        <p className="text-sm text-gray-400">Ingen data</p>
      </div>
    );
  }

  const now = getHelsinkiNow();
  const nowSec = toSeconds(now);
  const { nextDep, afterBreakDep, upcomingBreak, activeBreak } = resolveWithBreaks(
    departures,
    nowSec,
    breaks
  );

  if (!nextDep) {
    return (
      <div className="flex-1 flex items-center px-6 py-4">
        <p className="text-sm text-gray-400">Inga avgångar</p>
      </div>
    );
  }

  const secs = nextDep.secondsUntil;
  const isImminent = secs < 60;
  const parts = formatCountdownParts(secs);

  const urgencyClass =
    secs < 120
      ? 'text-red-600 dark:text-red-400'
      : secs < 300
      ? 'text-orange-500 dark:text-orange-400'
      : 'text-ferry-navy dark:text-white';

  const currentIdx = departures.indexOf(nextDep.departure);
  const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % departures.length : -1;
  const nextNextDep = nextIdx >= 0 ? departures[nextIdx] : null;
  const nextNextIsNextDay = nextIdx >= 0 && nextIdx < currentIdx;

  // Calculate wait between next and next-next departure
  let waitMins = null;
  if (nextNextDep) {
    let diff = depToSeconds(nextNextDep) - depToSeconds(nextDep.departure);
    if (diff < 0) diff += 24 * 3600;
    waitMins = Math.round(diff / 60);
  }
  const longWait = waitMins !== null && waitMins > 20;

  function formatWait(mins) {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
  }

  return (
    <div className="flex-1 relative flex items-center justify-center px-5 py-4 min-h-0">

      {/* Label — absolute left so it doesn't shift the countdown off-centre */}
      <div className="absolute left-5 flex flex-col leading-tight">
        <span className="text-xs text-ferry-blue dark:text-blue-300">{label.pre}</span>
        <span className="text-base font-bold italic text-ferry-blue dark:text-blue-300">{label.main}</span>
        <span className="text-xs text-ferry-blue dark:text-blue-300">{label.post}</span>
      </div>

      {/* Countdown — centred across the full row width */}
      <div className={`flex flex-col items-center ${isImminent ? 'animate-pulse' : ''}`}>

        {/* Big number(s) + small unit(s) */}
        <div className="flex items-baseline gap-2 flex-wrap justify-center">
          {isImminent ? (
            <span className={`text-8xl font-bold tabular-nums leading-none ${urgencyClass}`}>
              {formatMMSS(secs)}
            </span>
          ) : (
            parts.map(({ num, unit }) => (
              <span key={unit} className="flex items-baseline gap-1">
                <span className={`text-8xl font-bold tabular-nums leading-none ${urgencyClass}`}>
                  {num}
                </span>
                <span className={`text-base font-semibold ${urgencyClass} opacity-80`}>
                  {unit}
                </span>
              </span>
            ))
          )}
          {secs < 60 && (
            <span className="text-sm text-red-500 dark:text-red-400 font-semibold">Skynda!</span>
          )}
        </div>

        {/* Departure time — centred directly below the number */}
        <p className="text-base text-gray-400 dark:text-slate-400 tabular-nums mt-1">
          ({nextDep.isNextDay ? 'imorgon ' : ''}{nextDep.departure})
        </p>

        {/* Break info */}
        {upcomingBreak && (
          <p className="text-xs mt-0.5 text-amber-700 dark:text-amber-400 text-center">
            {activeBreak
              ? `Paus mellan ${upcomingBreak.start}–${upcomingBreak.end}${afterBreakDep ? `, sedan ${afterBreakDep.departure}` : ''}`
              : `Paus mellan ${upcomingBreak.start}–${upcomingBreak.end}`}
          </p>
        )}

        {/* Next-next departure — red pill if unusually long wait */}
        {!upcomingBreak && nextNextDep && (
          longWait ? (
            <span className="mt-1.5 inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full px-3 py-0.5 text-xs font-medium">
              Sedan {formatWait(waitMins)} väntan till {nextNextIsNextDay ? 'imorgon ' : ''}{nextNextDep}
            </span>
          ) : (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              Sedan: {nextNextIsNextDay ? 'imorgon ' : ''}{nextNextDep}
            </p>
          )
        )}
      </div>

    </div>
  );
}
