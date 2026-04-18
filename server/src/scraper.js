import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || '/data';
const TIMETABLE_PATH = path.join(DATA_DIR, 'timetable.json');
const MAIN_URL =
  'https://www.finferries.fi/sv/farjetrafik/farjplatserna-och-tidtabellerna/skaldo.html';

const FALLBACK_BREAKS = [
  { start: '11:10', end: '11:30' },
  { start: '14:10', end: '14:30' },
  { start: '17:10', end: '17:30' },
  { start: '00:10', end: '00:45' },
  { start: '03:00', end: '03:30' },
];

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'farjan-timetable-bot/1.0' },
    timeout: 15000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function parseBreak(text) {
  const match = text.trim().match(/^(\d{1,2})[.:](\d{2})\s*[–\-]\s*(\d{1,2})[.:](\d{2})$/);
  if (!match) return null;
  const pad = (n) => String(parseInt(n, 10)).padStart(2, '0');
  return { start: `${pad(match[1])}:${pad(match[2])}`, end: `${pad(match[3])}:${pad(match[4])}` };
}

/**
 * Parse an already-loaded Cheerio object for a finferries timetable sub-page.
 * Returns { timetables, breaks, validityFrom } — reusable by registry and cache.
 */
export function parseTimetablePage($, sourceUrl) {
  // Detect all <h4> headings that precede a departure list
  const timetables = {};
  const foundHeadings = [];

  $('h4').each((_, h4el) => {
    const label = $(h4el).text().trim();
    const ul = $(h4el).nextAll('ul.pick_ferry_line__detail_window__times').first();
    if (!ul.length) return;

    const departures = [];
    ul.find('li').each((_, li) => {
      const t = $(li).text().trim();
      if (/^\d{2}:\d{2}$/.test(t)) departures.push(t);
    });

    if (departures.length) {
      foundHeadings.push({ label, departures });
    }
  });

  // Map headings to island / mainland keys based on Finnish/Swedish suffixes
  for (const { label, departures } of foundHeadings) {
    const lower = label.toLowerCase();
    if (lower.includes('saari') || lower.includes('ö)')) {
      timetables.island = { location: label, departures };
    } else if (lower.includes('mantere') || lower.includes('fastland')) {
      timetables.mainland = { location: label, departures };
    } else {
      // Single-terminal ferry — treat as island
      if (!timetables.island) timetables.island = { location: label, departures };
      else timetables.mainland = { location: label, departures };
    }
  }

  // Parse breaks
  let breaks = [];
  $('p').each((_, el) => {
    const html = $(el).html() || '';
    if (!html.includes('Tauot') && !html.includes('Pauser') && !html.includes('Breaks')) return;
    const lines = html.replace(/<br\s*\/?>/gi, '\n').split('\n');
    for (const line of lines) {
      const clean = line.replace(/<[^>]+>/g, '').replace(/&ndash;/g, '–').trim();
      const parsed = parseBreak(clean);
      if (parsed) breaks.push(parsed);
    }
  });

  if (!breaks.length) breaks = FALLBACK_BREAKS;

  // Parse validity date
  let validityFrom = null;
  $('.effective_header').each((_, el) => {
    const text = $(el).text().trim();
    const match = text.match(/(\d{2}\.\d{2}\.\d{4})/);
    if (match) {
      const [d, m, y] = match[1].split('.');
      validityFrom = `${y}-${m}-${d}`;
    }
  });

  return { timetables, breaks, validityFrom };
}

/**
 * Scrape a timetable sub-page URL and return parsed data.
 * Throws on network or parse failure.
 */
export async function scrapeTimetableUrl(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const { timetables, breaks, validityFrom } = parseTimetablePage($, url);

  const totalDeps =
    (timetables.island?.departures?.length ?? 0) +
    (timetables.mainland?.departures?.length ?? 0);

  if (!totalDeps) throw new Error(`No departures found at ${url}`);

  return {
    metadata: {
      lastScrapedAt: new Date().toISOString(),
      requestedAt: new Date().toISOString(),
      timezone: 'Europe/Helsinki',
      validityFrom,
      scraperStatus: 'success',
      errorMessage: null,
      breaks,
      timetableUrl: url,
    },
    timetables,
  };
}

/**
 * Quick check: does this URL have any departure data?
 * Returns true/false without throwing.
 */
export async function hasDepartures(url) {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    return $('ul.pick_ferry_line__detail_window__times li').length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Backward-compatible Skåldö scraper (used by scheduler + /api/refresh)
// ---------------------------------------------------------------------------

export async function runScraper() {
  ensureDataDir();
  const requestedAt = new Date().toISOString();

  let timetableUrl;
  try {
    const mainHtml = await fetchHtml(MAIN_URL);
    const $main = cheerio.load(mainHtml);

    let rawAttr = null;
    $main('[data-timetable-url]').each((_, el) => {
      const val = $main(el).attr('data-timetable-url') || '';
      if (val.toLowerCase().includes('skaldo')) { rawAttr = val; return false; }
    });
    if (!rawAttr) throw new Error('Skåldö data-timetable-url not found on main page');
    timetableUrl = rawAttr.split(',')[0].trim();
    console.log(`[scraper] Skåldö timetable sub-page: ${timetableUrl}`);
  } catch (err) {
    console.error('[scraper] Failed to resolve Skåldö URL:', err.message);
    writeError(TIMETABLE_PATH, requestedAt, err.message);
    return;
  }

  try {
    const data = await scrapeTimetableUrl(timetableUrl);
    data.metadata.requestedAt = requestedAt;
    data.metadata.sourceUrl = MAIN_URL;

    // Write legacy path (backward compat)
    fs.writeFileSync(TIMETABLE_PATH, JSON.stringify(data, null, 2), 'utf8');

    // Also write to slug-based cache so /api/timetable/:slug hits the same data
    const slug = timetableUrl.split('/').pop().replace(/\.html?$/i, '');
    const slugDir = path.join(DATA_DIR, 'timetables');
    if (!fs.existsSync(slugDir)) fs.mkdirSync(slugDir, { recursive: true });
    fs.writeFileSync(path.join(slugDir, `${slug}.json`), JSON.stringify(data, null, 2), 'utf8');

    const total = (data.timetables.island?.departures?.length ?? 0) +
                  (data.timetables.mainland?.departures?.length ?? 0);
    console.log(`[scraper] Skåldö saved (${total} total departures) → ${TIMETABLE_PATH} + timetables/${slug}.json`);
  } catch (err) {
    console.error('[scraper] Failed to scrape Skåldö:', err.message);
    writeError(TIMETABLE_PATH, requestedAt, err.message);
  }
}

function writeError(filePath, requestedAt, message) {
  ensureDataDir();
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) {}
  fs.writeFileSync(filePath, JSON.stringify({
    ...existing,
    metadata: { ...(existing.metadata || {}), lastScrapedAt: new Date().toISOString(), requestedAt, scraperStatus: 'error', errorMessage: message },
  }, null, 2), 'utf8');
}
