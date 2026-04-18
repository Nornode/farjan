import fs from 'fs';
import path from 'path';
import { scrapeTimetableUrl, ensureDataDir } from './scraper.js';
import { loadRegistry } from './ferryRegistry.js';

const DATA_DIR = process.env.DATA_DIR || '/data';
const TIMETABLES_DIR = path.join(DATA_DIR, 'timetables');
const LEGACY_PATH = path.join(DATA_DIR, 'timetable.json');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function timetablePath(slug) {
  return path.join(TIMETABLES_DIR, `${slug}.json`);
}

function ensureTimetablesDir() {
  ensureDataDir();
  if (!fs.existsSync(TIMETABLES_DIR)) fs.mkdirSync(TIMETABLES_DIR, { recursive: true });
}

function isCacheFresh(slug) {
  try {
    const raw = JSON.parse(fs.readFileSync(timetablePath(slug), 'utf8'));
    const scraped = raw?.metadata?.lastScrapedAt;
    if (!scraped) return false;
    return Date.now() - new Date(scraped).getTime() < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * If the legacy timetable.json matches this slug (same timetableUrl slug) and is
 * still fresh, copy it into the slug cache so we don't need a new scrape.
 * Returns true if the seed succeeded.
 */
function seedFromLegacy(slug, cachePath) {
  try {
    const raw = JSON.parse(fs.readFileSync(LEGACY_PATH, 'utf8'));
    const scraped = raw?.metadata?.lastScrapedAt;
    if (!scraped) return false;
    if (Date.now() - new Date(scraped).getTime() >= CACHE_TTL_MS) return false;
    const legacySlug = raw?.metadata?.timetableUrl?.split('/').pop()?.replace(/\.html?$/i, '');
    if (legacySlug !== slug) return false;
    fs.writeFileSync(cachePath, JSON.stringify(raw, null, 2), 'utf8');
    console.log(`[cache] Seeded ${slug} from legacy timetable.json`);
    return true;
  } catch {
    return false;
  }
}

function urlForSlug(slug) {
  const registry = loadRegistry();
  if (!registry) return null;
  for (const ferry of registry.ferries) {
    for (const variant of ferry.variants) {
      if (variant.slug === slug) return variant.url;
    }
  }
  return null;
}

/**
 * Get a timetable for the given slug.
 *  - If cached and fresh, return cached data.
 *  - If legacy timetable.json matches the slug and is fresh, seed from it.
 *  - Otherwise scrape, persist, and return fresh data.
 * Throws if the slug is unknown or scraping fails.
 */
export async function getTimetable(slug) {
  ensureTimetablesDir();

  const cachePath = timetablePath(slug);

  if (isCacheFresh(slug)) {
    console.log(`[cache] Serving cached timetable for ${slug}`);
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  // Migrate from legacy timetable.json if it matches (avoids a redundant scrape)
  if (seedFromLegacy(slug, cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  const url = urlForSlug(slug);
  if (!url) throw new Error(`Unknown ferry slug: ${slug}`);

  console.log(`[cache] Scraping fresh timetable for ${slug} from ${url}`);
  const data = await scrapeTimetableUrl(url);

  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf8');
  const total =
    (data.timetables.island?.departures?.length ?? 0) +
    (data.timetables.mainland?.departures?.length ?? 0);
  console.log(`[cache] Saved timetable for ${slug} (${total} total departures)`);

  return data;
}
