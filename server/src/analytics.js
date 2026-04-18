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
    path: req.path,
    referrer: req.headers['referer'] ?? null,
  });
}

export function recordFerryView(slug, req) {
  appendEvent({
    timestamp: new Date().toISOString(),
    type: 'ferry_view',
    ipHash: hashIp(clientIp(req)),
    userAgent: req.headers['user-agent'] ?? null,
    path: req.path,
    referrer: req.headers['referer'] ?? null,
    ferrySlug: slug,
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

  const viewsPerDay = {};    // { 'YYYY-MM-DD': { page_views, ferry_views, uniqueIps: Set } }
  const ferryViewCount = {}; // { slug: count }
  const uaCount = {};        // { ua: count }

  for (const ev of events) {
    if (ev.type === 'page_view') totalPageViews++;
    if (ev.type === 'ferry_view') totalFerryViews++;

    // Count user-agents
    if (ev.userAgent) {
      uaCount[ev.userAgent] = (uaCount[ev.userAgent] ?? 0) + 1;
    }

    // Per-ferry counts
    if (ev.type === 'ferry_view' && ev.ferrySlug) {
      ferryViewCount[ev.ferrySlug] = (ferryViewCount[ev.ferrySlug] ?? 0) + 1;
    }

    // Per-day breakdown (last 30 days only)
    if (new Date(ev.timestamp) >= thirtyDaysAgo) {
      const day = toDay(ev.timestamp);
      if (!viewsPerDay[day]) {
        viewsPerDay[day] = { page_views: 0, ferry_views: 0, uniqueIps: new Set() };
      }
      if (ev.type === 'page_view') viewsPerDay[day].page_views++;
      if (ev.type === 'ferry_view') viewsPerDay[day].ferry_views++;
      if (ev.ipHash) viewsPerDay[day].uniqueIps.add(ev.ipHash);
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

  return {
    summary: {
      total_page_views: totalPageViews,
      total_ferry_views: totalFerryViews,
      total_unique_visitors: allIps.size,
      most_popular_ferry: topFerries[0]?.slug ?? null,
    },
    views_per_day: viewsPerDaySerialized,
    top_ferries: topFerries,
    top_user_agents: topUserAgents,
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
