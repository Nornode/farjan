import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || '/data';
const TIMETABLE_PATH = path.join(DATA_DIR, 'timetable.json');
const MAIN_URL =
  'https://www.finferries.fi/sv/farjetrafik/farjplatserna-och-tidtabellerna/skaldo.html';

// Fallback breaks in case the page structure changes
const FALLBACK_BREAKS = [
  { start: '11:10', end: '11:30' },
  { start: '14:10', end: '14:30' },
  { start: '17:10', end: '17:30' },
  { start: '00:10', end: '00:45' },
  { start: '03:00', end: '03:30' },
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'farjan-timetable-bot/1.0' },
    timeout: 15000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

// Parse "11.10–11.30" or "11:10–11:30" style break strings
function parseBreak(text) {
  const match = text.trim().match(/^(\d{1,2})[.:](\d{2})\s*[–\-]\s*(\d{1,2})[.:](\d{2})$/);
  if (!match) return null;
  const pad = (n) => String(parseInt(n, 10)).padStart(2, '0');
  return { start: `${pad(match[1])}:${pad(match[2])}`, end: `${pad(match[3])}:${pad(match[4])}` };
}

export async function runScraper() {
  ensureDataDir();
  const requestedAt = new Date().toISOString();

  // Step 1: Find the timetable sub-page URL from the main page
  let timetableUrl;
  try {
    const mainHtml = await fetchHtml(MAIN_URL);
    const $main = cheerio.load(mainHtml);

    // The timetable URL is stored in data-timetable-url attributes (one per ferry route).
    // Find the one that references the skaldo timetable.
    let rawAttr = null;
    $main('[data-timetable-url]').each((_, el) => {
      const val = $main(el).attr('data-timetable-url') || '';
      if (val.toLowerCase().includes('skaldo')) {
        rawAttr = val;
        return false; // break
      }
    });
    if (!rawAttr) throw new Error('Skåldö data-timetable-url not found on main page');

    // Attribute can contain comma-separated URLs; take the first, trimmed
    timetableUrl = rawAttr.split(',')[0].trim();
    console.log(`[scraper] Timetable sub-page: ${timetableUrl}`);
  } catch (err) {
    console.error('[scraper] Failed to resolve timetable URL:', err.message);
    writeError(requestedAt, err.message);
    return;
  }

  // Step 2: Fetch and parse the actual timetable page
  let html;
  try {
    html = await fetchHtml(timetableUrl);
  } catch (err) {
    console.error('[scraper] Failed to fetch timetable page:', err.message);
    writeError(requestedAt, err.message);
    return;
  }

  const $ = cheerio.load(html);

  // Step 3: Parse both timetable sections
  // Structure: <h4>Skåldö (saari/ö)</h4>
  //            <ul class="pick_ferry_line__detail_window__times"><li>05:00</li>...
  const sectionDefs = [
    { key: 'island', label: 'Skåldö (saari/ö)' },
    { key: 'mainland', label: 'Skåldö (mantere/fastland)' },
  ];

  const timetables = {};

  for (const def of sectionDefs) {
    const heading = $('h4').filter((_, el) => $(el).text().trim() === def.label).first();

    if (!heading.length) {
      console.warn(`[scraper] Heading "${def.label}" not found`);
      timetables[def.key] = { location: def.label, departures: [] };
      continue;
    }

    // The <ul> is the next sibling after the heading (possibly inside same parent div)
    const ul = heading.nextAll('ul.pick_ferry_line__detail_window__times').first();
    const departures = [];

    ul.find('li').each((_, li) => {
      const text = $(li).text().trim();
      // Validate HH:MM format
      if (/^\d{2}:\d{2}$/.test(text)) {
        departures.push(text);
      }
    });

    timetables[def.key] = { location: def.label, departures };
    console.log(`[scraper] ${def.label}: ${departures.length} departures`);
  }

  // Step 4: Parse break times
  // Structure: <p>Tauot / Pauser / Breaks:<br>11.10–11.30<br>14.10–14.30<br>...</p>
  let breaks = [];
  $('p').each((_, el) => {
    const html = $(el).html() || '';
    if (!html.includes('Tauot') && !html.includes('Pauser') && !html.includes('Breaks')) return;

    // Replace <br> tags with newlines, then split
    const lines = html.replace(/<br\s*\/?>/gi, '\n').split('\n');
    for (const line of lines) {
      // Strip any remaining HTML tags
      const clean = line.replace(/<[^>]+>/g, '').replace(/&ndash;/g, '–').trim();
      const parsed = parseBreak(clean);
      if (parsed) breaks.push(parsed);
    }
  });

  if (!breaks.length) {
    console.warn('[scraper] No breaks parsed from page – using fallback list');
    breaks = FALLBACK_BREAKS;
  } else {
    console.log(`[scraper] Parsed ${breaks.length} break periods`);
  }

  // Step 5: Parse validity date
  // Structure: <span class="effective_header">Giltig 01.04.2026–</span>
  let validityFrom = null;
  $('.effective_header').each((_, el) => {
    const text = $(el).text().trim();
    const match = text.match(/(\d{2}\.\d{2}\.\d{4})/);
    if (match) {
      const [d, m, y] = match[1].split('.');
      validityFrom = `${y}-${m}-${d}`;
    }
  });

  // Step 6: Write JSON
  const data = {
    metadata: {
      lastScrapedAt: new Date().toISOString(),
      requestedAt,
      timezone: 'Europe/Helsinki',
      validityFrom,
      scraperStatus: 'success',
      errorMessage: null,
      breaks,
      sourceUrl: MAIN_URL,
      timetableUrl,
    },
    timetables,
  };

  fs.writeFileSync(TIMETABLE_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`[scraper] Saved to ${TIMETABLE_PATH}`);
}

function writeError(requestedAt, message) {
  ensureDataDir();
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(TIMETABLE_PATH, 'utf8'));
  } catch (_) {}

  const data = {
    ...existing,
    metadata: {
      ...(existing.metadata || {}),
      lastScrapedAt: new Date().toISOString(),
      requestedAt,
      scraperStatus: 'error',
      errorMessage: message,
    },
  };

  fs.writeFileSync(TIMETABLE_PATH, JSON.stringify(data, null, 2), 'utf8');
}
