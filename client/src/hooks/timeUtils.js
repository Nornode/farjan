/**
 * Returns the current time in Europe/Helsinki as { h, m, s }.
 */
export function getHelsinkiNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Helsinki',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const get = (type) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

  // Intl can return 24 for midnight in some environments; normalise to 0
  const h = get('hour') % 24;
  return { h, m: get('minute'), s: get('second') };
}

/**
 * Convert { h, m, s } to total seconds from midnight.
 */
export function toSeconds({ h, m, s = 0 }) {
  return h * 3600 + m * 60 + s;
}

/**
 * Parse "HH:MM" departure string to seconds from midnight.
 */
export function depToSeconds(dep) {
  const [h, m] = dep.split(':').map(Number);
  return h * 3600 + m * 60;
}

/**
 * Returns true if the time (seconds) falls within a break period.
 */
export function isDuringBreak(seconds, breaks) {
  return breaks.some((b) => {
    const bs = depToSeconds(b.start);
    const be = depToSeconds(b.end);
    return seconds >= bs && seconds < be;
  });
}

/**
 * Find the next departure at or after `nowSeconds`.
 * If allowSameMinute is false, only returns departures strictly after now.
 * Returns { departure, secondsUntil, isNextDay } or null.
 */
export function findNextDeparture(departures, nowSeconds, allowSameMinute = true) {
  if (!departures?.length) return null;

  const DAY = 24 * 3600;

  for (const dep of departures) {
    const depSec = depToSeconds(dep);
    let diff = depSec - nowSeconds;

    if (allowSameMinute ? diff >= 0 : diff > 0) {
      return { departure: dep, secondsUntil: diff, isNextDay: false };
    }
  }

  // Wrap around to first departure of "tomorrow"
  const firstDep = departures[0];
  const firstDepSec = depToSeconds(firstDep);
  const diff = DAY - nowSeconds + firstDepSec;
  return { departure: firstDep, secondsUntil: diff, isNextDay: true };
}

/**
 * Find the next departure strictly after the given departure string.
 */
export function findDepartureAfter(departures, afterDep, nowSeconds) {
  if (!departures?.length) return null;

  const afterSec = depToSeconds(afterDep);
  const DAY = 24 * 3600;

  for (const dep of departures) {
    const depSec = depToSeconds(dep);
    if (depSec > afterSec) {
      return { departure: dep, secondsUntil: depSec - nowSeconds, isNextDay: false };
    }
  }

  // Wrap to next day
  const firstDep = departures[0];
  const firstDepSec = depToSeconds(firstDep);
  return {
    departure: firstDep,
    secondsUntil: DAY - nowSeconds + firstDepSec,
    isNextDay: true,
  };
}

/**
 * Given the "next departure", check if it falls inside a break and if so,
 * find the departure after the break ends.
 * Returns { nextDep, afterBreakDep, upcomingBreak } where upcomingBreak is
 * the break that affects nextDep (or null).
 */
export function resolveWithBreaks(departures, nowSeconds, breaks) {
  const next = findNextDeparture(departures, nowSeconds);
  if (!next) return { nextDep: null, afterBreakDep: null, upcomingBreak: null };

  const nextSec = depToSeconds(next.departure);

  // Check if the next departure falls in a break
  const activeBreak = breaks.find((b) => {
    const bs = depToSeconds(b.start);
    const be = depToSeconds(b.end);
    return nextSec >= bs && nextSec < be;
  });

  // Check if a break is approaching (starts within 30 min after next dep)
  const approachingBreak = breaks.find((b) => {
    const bs = depToSeconds(b.start);
    return bs > nextSec && bs - nextSec <= 30 * 60;
  });

  const relevantBreak = activeBreak || approachingBreak || null;

  let afterBreakDep = null;
  if (activeBreak) {
    // Find first departure after the break ends
    const breakEndSec = depToSeconds(activeBreak.end);
    afterBreakDep = findNextDeparture(departures, breakEndSec);
  }

  return { nextDep: next, afterBreakDep, upcomingBreak: relevantBreak, activeBreak };
}

/**
 * Format seconds into a human-readable countdown string.
 * < 60 s  → "42 sek"
 * < 3600 s → "27 min"
 * >= 3600 s → "2 tim 15 min"
 */
export function formatCountdown(seconds) {
  if (seconds < 60) return `${seconds} sek`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return `${m} min`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h} tim ${m} min` : `${h} tim`;
}

/**
 * Like formatCountdown but returns an array of { num, unit } pairs so the
 * caller can render the number and unit at different sizes.
 * < 60 s  → [{ num: "42", unit: "sek" }]
 * < 3600 s → [{ num: "27", unit: "min" }]
 * >= 3600 s → [{ num: "2", unit: "tim" }, { num: "15", unit: "min" }]
 */
export function formatCountdownParts(seconds) {
  if (seconds < 60) return [{ num: String(seconds), unit: 'sek' }];
  if (seconds < 3600) return [{ num: String(Math.floor(seconds / 60)), unit: 'min' }];
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [{ num: String(h), unit: 'tim' }];
  if (m > 0) parts.push({ num: String(m), unit: 'min' });
  return parts;
}


export function formatMMSS(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
