import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from './config.js';

const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.jsonl');
const ENABLED = process.env.LOG_ANALYTICS !== 'false';

// Retention window for log rotation (90 days)
export const ANALYTICS_RETENTION_DAYS = 90;

// Hash an IP address with SHA-256 — never store raw IPs
function hashIp(ip) {
  return crypto.createHash('sha256').update(ip ?? 'unknown').digest('hex');
}

// Resolve real client IP, respecting X-Forwarded-For from reverse proxies
function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

// Derive device category from User-Agent string — no personal data
function parseDeviceCategory(ua) {
  if (!ua) return 'unknown';
  if (/iPad|Kindle|Silk/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return 'mobile';
  return 'desktop';
}

// Extract hostname from a referrer URL; returns null on failure
function parseReferrerDomain(referrer) {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname || null;
  } catch {
    return null;
  }
}

// Extract the base language tag from an Accept-Language header (e.g. "fi-FI,fi;q=0.9" → "fi")
function parseLanguage(acceptLanguage) {
  if (!acceptLanguage) return null;
  const first = acceptLanguage.split(',')[0].trim().split(';')[0].trim();
  return first.split('-')[0].toLowerCase() || null;
}

// Formatter reused across calls for performance
const hourDowFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Helsinki',
  hour: 'numeric',
  weekday: 'short',
  hour12: false,
  hourCycle: 'h23',
});

// Return { hour: 0-23, dow: 0-6 } in Helsinki timezone (dow: 0 = Sunday)
function toHourAndDow(isoString) {
  const parts = hourDowFormatter.formatToParts(new Date(isoString));
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const DOW_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hour, dow: DOW_MAP[weekday] ?? 0 };
}

function appendEvent(event) {
  if (!ENABLED) return;
  try {
    fs.mkdirSync(path.dirname(ANALYTICS_FILE), { recursive: true });
    fs.appendFileSync(ANALYTICS_FILE, JSON.stringify(event) + '\n', 'utf8');
  } catch (err) {
    console.error('[analytics] Failed to write event:', err.message);
  }
}

export function recordPageView(req) {
  appendEvent({
    timestamp: new Date().toISOString(),
    type: 'page_view',
    ipHash: hashIp(clientIp(req)),
    userAgent: req.headers['user-agent'] ?? null,
    deviceCategory: parseDeviceCategory(req.headers['user-agent']),
    language: parseLanguage(req.headers['accept-language']),
    path: req.path,
    referrer: req.headers['referer'] ?? null,
    referrerDomain: parseReferrerDomain(req.headers['referer']),
  });
}

export function recordFerryView(slug, req) {
  appendEvent({
    timestamp: new Date().toISOString(),
    type: 'ferry_view',
    ipHash: hashIp(clientIp(req)),
    userAgent: req.headers['user-agent'] ?? null,
    deviceCategory: parseDeviceCategory(req.headers['user-agent']),
    language: parseLanguage(req.headers['accept-language']),
    path: req.path,
    referrer: req.headers['referer'] ?? null,
    referrerDomain: parseReferrerDomain(req.headers['referer']),
    ferrySlug: slug,
  });
}

// Record a load of the analytics dashboard itself — kept separate from user traffic
export function recordAnalyticsView(req) {
  appendEvent({
    timestamp: new Date().toISOString(),
    type: 'analytics_view',
    ipHash: hashIp(clientIp(req)),
    userAgent: req.headers['user-agent'] ?? null,
    path: req.path,
  });
}

// Record client-side environment data sent via the /api/beacon endpoint
export function recordClientInfo(data, req) {
  appendEvent({
    timestamp: new Date().toISOString(),
    type: 'client_info',
    ipHash: hashIp(clientIp(req)),
    viewport: data.viewport ?? null,
    colorScheme: data.colorScheme ?? null,
    displayMode: data.displayMode ?? null,
    connectionType: data.connectionType ?? null,
    ttiBucket: data.ttiBucket ?? null,
  });
}

// Read and parse all events from the JSONL file
function readEvents() {
  try {
    const raw = fs.readFileSync(ANALYTICS_FILE, 'utf8');
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

// Return YYYY-MM-DD string for a timestamp (Helsinki timezone)
function toDay(isoString) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoString));
}

export function aggregateAnalytics() {
  const events = readEvents();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let totalPageViews = 0;
  let totalFerryViews = 0;
  let totalAnalyticsViews = 0;

  const viewsPerDay = {};    // { 'YYYY-MM-DD': { page_views, ferry_views, uniqueIps: Set } }
  const ferryViewCount = {}; // { slug: count }
  const uaCount = {};        // { ua: count }
  const deviceCount = { mobile: 0, tablet: 0, desktop: 0, unknown: 0 };
  const langCount = {};
  const refDomainCount = {};
  const hourCount = {};      // { 0..23: count }
  const dowCount = {};       // { 0..6: count }  0 = Sunday
  const ipDays = {};         // { ipHash: Set<day> } — for new/returning
  const viewportCount = {};
  const colorSchemeCount = {};
  const displayModeCount = {};
  const connTypeCount = {};
  const ttiBucketCount = {};

  for (const ev of events) {
    const isView = ev.type === 'page_view' || ev.type === 'ferry_view';

    if (ev.type === 'page_view') totalPageViews++;
    if (ev.type === 'ferry_view') totalFerryViews++;
    if (ev.type === 'analytics_view') totalAnalyticsViews++;

    // User-agents (page/ferry views only)
    if (isView && ev.userAgent) {
      uaCount[ev.userAgent] = (uaCount[ev.userAgent] ?? 0) + 1;
    }

    // Per-ferry counts
    if (ev.type === 'ferry_view' && ev.ferrySlug) {
      ferryViewCount[ev.ferrySlug] = (ferryViewCount[ev.ferrySlug] ?? 0) + 1;
    }

    // Per-day breakdown (last 30 days only)
    if (isView && new Date(ev.timestamp) >= thirtyDaysAgo) {
      const day = toDay(ev.timestamp);
      if (!viewsPerDay[day]) {
        viewsPerDay[day] = { page_views: 0, ferry_views: 0, uniqueIps: new Set() };
      }
      if (ev.type === 'page_view') viewsPerDay[day].page_views++;
      if (ev.type === 'ferry_view') viewsPerDay[day].ferry_views++;
      if (ev.ipHash) viewsPerDay[day].uniqueIps.add(ev.ipHash);
    }

    if (isView) {
      // Device category
      const cat = ev.deviceCategory ?? 'unknown';
      deviceCount[cat] = (deviceCount[cat] ?? 0) + 1;

      // Language
      if (ev.language) {
        langCount[ev.language] = (langCount[ev.language] ?? 0) + 1;
      }

      // Referrer domain
      if (ev.referrerDomain) {
        refDomainCount[ev.referrerDomain] = (refDomainCount[ev.referrerDomain] ?? 0) + 1;
      }

      // Hour-of-day and day-of-week (Helsinki timezone)
      const { hour, dow } = toHourAndDow(ev.timestamp);
      hourCount[hour] = (hourCount[hour] ?? 0) + 1;
      dowCount[dow] = (dowCount[dow] ?? 0) + 1;

      // Track which days each IP hash has been seen (for new/returning)
      if (ev.ipHash) {
        if (!ipDays[ev.ipHash]) ipDays[ev.ipHash] = new Set();
        ipDays[ev.ipHash].add(toDay(ev.timestamp));
      }
    }

    // Client-side beacon events
    if (ev.type === 'client_info') {
      if (ev.viewport) viewportCount[ev.viewport] = (viewportCount[ev.viewport] ?? 0) + 1;
      if (ev.colorScheme) colorSchemeCount[ev.colorScheme] = (colorSchemeCount[ev.colorScheme] ?? 0) + 1;
      if (ev.displayMode) displayModeCount[ev.displayMode] = (displayModeCount[ev.displayMode] ?? 0) + 1;
      if (ev.connectionType) connTypeCount[ev.connectionType] = (connTypeCount[ev.connectionType] ?? 0) + 1;
      if (ev.ttiBucket) ttiBucketCount[ev.ttiBucket] = (ttiBucketCount[ev.ttiBucket] ?? 0) + 1;
    }
  }

  // Serialize viewsPerDay (convert Set → count, fill in last 30 days)
  const viewsPerDaySerialized = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day = toDay(d.toISOString());
    const entry = viewsPerDay[day];
    viewsPerDaySerialized[day] = {
      page_views: entry?.page_views ?? 0,
      ferry_views: entry?.ferry_views ?? 0,
      unique_ips: entry ? entry.uniqueIps.size : 0,
    };
  }

  // Total unique IP hashes across all events
  const allIps = new Set(events.map((e) => e.ipHash).filter(Boolean));

  // New vs returning: IPs seen on only one calendar day = new; more than one = returning
  let newVisitors = 0;
  let returningVisitors = 0;
  for (const days of Object.values(ipDays)) {
    if (days.size > 1) returningVisitors++;
    else newVisitors++;
  }

  // Top 10 ferries
  const topFerries = Object.entries(ferryViewCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slug, count]) => ({ slug, count }));

  // Top 10 user-agents
  const topUserAgents = Object.entries(uaCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ua, count]) => ({ ua, count }));

  // Top 10 languages
  const topLanguages = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([lang, count]) => ({ lang, count }));

  // Top 10 referrer domains
  const topReferrerDomains = Object.entries(refDomainCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => ({ domain, count }));

  // Hour-of-day distribution (24 slots, Helsinki time)
  const hourDistribution = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: hourCount[h] ?? 0,
  }));

  // Day-of-week distribution (0 = Sunday … 6 = Saturday, Helsinki time)
  const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowDistribution = Array.from({ length: 7 }, (_, d) => ({
    dow: d,
    name: DOW_NAMES[d],
    count: dowCount[d] ?? 0,
  }));

  // Helper: sort an object of { label: count } into a ranked array
  const toRankedEntries = (obj) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));

  return {
    summary: {
      total_page_views: totalPageViews,
      total_ferry_views: totalFerryViews,
      total_analytics_views: totalAnalyticsViews,
      total_unique_visitors: allIps.size,
      most_popular_ferry: topFerries[0]?.slug ?? null,
      new_visitors: newVisitors,
      returning_visitors: returningVisitors,
    },
    views_per_day: viewsPerDaySerialized,
    top_ferries: topFerries,
    top_user_agents: topUserAgents,
    devices: deviceCount,
    languages: topLanguages,
    referrer_domains: topReferrerDomains,
    hour_distribution: hourDistribution,
    dow_distribution: dowDistribution,
    client_info: {
      viewports: toRankedEntries(viewportCount),
      color_schemes: toRankedEntries(colorSchemeCount),
      display_modes: toRankedEntries(displayModeCount),
      connection_types: toRankedEntries(connTypeCount),
      tti_buckets: toRankedEntries(ttiBucketCount),
    },
  };
}

// Remove events older than ANALYTICS_RETENTION_DAYS from the JSONL file
export function rotateAnalyticsLog() {
  try {
    const events = readEvents();
    if (events.length === 0) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ANALYTICS_RETENTION_DAYS);

    const kept = events.filter((ev) => new Date(ev.timestamp) >= cutoff);
    const removed = events.length - kept.length;

    if (removed > 0) {
      fs.writeFileSync(ANALYTICS_FILE, kept.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
      console.log(`[analytics] Log rotation: removed ${removed} old events, kept ${kept.length}`);
    } else {
      console.log('[analytics] Log rotation: nothing to remove');
    }
  } catch (err) {
    console.error('[analytics] Log rotation failed:', err.message);
  }
}
