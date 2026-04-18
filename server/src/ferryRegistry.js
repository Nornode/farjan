import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { fetchHtml, parseTimetablePage, ensureDataDir } from './scraper.js';

const DATA_DIR = process.env.DATA_DIR || '/data';
const REGISTRY_PATH = path.join(DATA_DIR, 'ferries.json');
const MAIN_URL = 'https://www.finferries.fi/sv/farjetrafik/farjplatserna-och-tidtabellerna.html';

const REGISTRY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Concurrent fetch limit when verifying ferry timetables exist
const VERIFY_CONCURRENCY = 5;

/**
 * Detect day-of-week / season pattern from a timetable URL slug.
 */
function detectDayPattern(url) {
  const slug = url.toLowerCase();
  if (slug.includes('ma-fre') || slug.includes('ma-pe')) return 'mon-fri';
  if (slug.includes('lo-so') || slug.includes('la-su') || slug.includes('la-so')) return 'sat-sun';
  // Isolated -la- or ends with -la (Saturday-only slug)
  if (/(^|[-/])la([-/.]|$)/.test(slug)) return 'sat';
  // Isolated -su- / -so- or ends with -su/-so (Sunday-only slug)
  if (/(^|[-/])(su|so)([-/.]|$)/.test(slug)) return 'sun';
  if (slug.includes('kesa') || slug.includes('kesä')) return 'summer';
  if (slug.includes('talvi')) return 'winter';
  return 'all';
}

/**
 * Extract a URL slug from a full URL (last path segment without extension).
 */
function slugFromUrl(url) {
  const base = url.split('/').pop() || '';
  return base.replace(/\.html?$/i, '');
}

/**
 * Derive a stable ferry ID from its display name.
 * e.g. "Barösund" → "barosund", "Pellinki / Pellinge" → "pellinki-pellinge"
 */
function ferryId(name) {
  return name
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Run a function over an array with at most `limit` concurrent executions.
 */
async function pMap(items, fn, limit) {
  const results = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

/**
 * Parse the main ferry listing page and return candidate ferry objects
 * (not yet verified for actual timetable content).
 */
function parseMainPage($) {
  const candidates = [];

  $('[data-timetable-url]').each((_, el) => {
    const rawAttr = $(el).attr('data-timetable-url') || '';
    const rawName = $(el).text().replace(/!/g, '').trim();
    if (!rawName || !rawAttr.trim()) return;

    const urls = rawAttr
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    if (!urls.length) return;

    const id = ferryId(rawName);
    const variants = urls.map((url) => ({
      slug: slugFromUrl(url),
      url,
      dayPattern: detectDayPattern(url),
    }));

    candidates.push({ id, name: rawName, variants });
  });

  return candidates;
}

/**
 * Scrape the main finferries listing page and build a verified ferry registry.
 * Only ferries with at least one URL that has actual departure data are kept.
 * Writes result to /data/ferries.json and returns the registry object.
 */
export async function buildRegistry() {
  ensureDataDir();
  console.log('[registry] Building ferry registry from main page...');

  let candidates;
  try {
    const html = await fetchHtml(MAIN_URL);
    const $ = cheerio.load(html);
    candidates = parseMainPage($);
    console.log(`[registry] Found ${candidates.length} candidate ferries on main page`);
  } catch (err) {
    console.error('[registry] Failed to fetch main page:', err.message);
    throw err;
  }

  // Flatten all URLs to verify, keeping track of which ferry+variant they belong to
  const allVariants = candidates.flatMap((ferry) =>
    ferry.variants.map((v) => ({ ferryId: ferry.id, slug: v.slug, url: v.url }))
  );

  console.log(`[registry] Verifying ${allVariants.length} variant URLs (concurrency=${VERIFY_CONCURRENCY})...`);

  const verified = await pMap(allVariants, async ({ ferryId: fid, slug, url }) => {
    try {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      const { timetables } = parseTimetablePage($, url);
      // Only keep ferries that run between two distinct terminals (island ↔ mainland)
      const ok =
        (timetables.island?.departures?.length ?? 0) > 0 &&
        (timetables.mainland?.departures?.length ?? 0) > 0;
      return { ferryId: fid, slug, url, ok };
    } catch {
      return { ferryId: fid, slug, url, ok: false };
    }
  }, VERIFY_CONCURRENCY);

  // Build a Set of verified slugs
  const verifiedSlugs = new Set(verified.filter((v) => v.ok).map((v) => v.slug));

  // Filter candidates — only keep ferries where at least one variant is verified
  const ferries = candidates
    .map((ferry) => ({
      ...ferry,
      variants: ferry.variants.filter((v) => verifiedSlugs.has(v.slug)),
    }))
    .filter((ferry) => ferry.variants.length > 0);

  console.log(`[registry] ${ferries.length} ferries with verified timetables`);

  const registry = { lastUpdated: new Date().toISOString(), ferries };
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
  console.log(`[registry] Saved to ${REGISTRY_PATH}`);
  return registry;
}

/**
 * Load the registry from disk. Returns null if not found.
 */
export function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Return true if the registry exists and is less than 7 days old.
 */
export function isRegistryFresh() {
  const reg = loadRegistry();
  if (!reg?.lastUpdated) return false;
  return Date.now() - new Date(reg.lastUpdated).getTime() < REGISTRY_TTL_MS;
}

/**
 * Ensure the registry exists and is fresh. If stale or missing, rebuild it.
 * Non-throwing: logs error on failure.
 */
export async function ensureRegistry() {
  if (isRegistryFresh()) {
    const reg = loadRegistry();
    console.log(`[registry] Using cached registry (${reg.ferries.length} ferries, updated ${reg.lastUpdated})`);
    return;
  }
  try {
    await buildRegistry();
  } catch (err) {
    console.error('[registry] ensureRegistry failed:', err.message);
  }
}
