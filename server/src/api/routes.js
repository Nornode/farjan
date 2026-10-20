import express from 'express';
import fs from 'fs';
import path from 'path';
import { runScraper } from '../scraper.js';
import { loadRegistry, isRegistryFresh } from '../ferryRegistry.js';
import { getTimetable } from '../timetableCache.js';
import { DATA_DIR, TIMETABLE_TTL_MS } from '../config.js';
import { recordFerryView, recordClientInfo, aggregateAnalytics } from '../analytics.js';

const router = express.Router();
const TIMETABLE_PATH = path.join(DATA_DIR, 'timetable.json');
const TIMETABLES_DIR = path.join(DATA_DIR, 'timetables');
const SKALDO_FRESH_TTL_MS = 26 * 60 * 60 * 1000; // 24h cron schedule + 2h margin

// Backward-compat: Skåldö timetable
router.get('/timetable', async (req, res) => {
  const force = req.query.refresh === 'true' || req.query.force === 'true';
  if (force) {
    try {
      await runScraper();
    } catch (err) {
      console.error('[api] GET /timetable refresh error:', err.message);
    }
  }
  try {
    const raw = fs.readFileSync(TIMETABLE_PATH, 'utf8');
    res.setHeader('Cache-Control', 'no-cache');
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[api] GET /timetable error:', err.message);
    res.status(503).json({ error: 'Timetable not available yet' });
  }
});

// Ferry registry
router.get('/ferries', (_req, res) => {
  const registry = loadRegistry();
  if (!registry) {
    return res.status(503).json({ error: 'Ferry registry not available yet' });
  }
  res.setHeader('Cache-Control', 'no-cache');
  res.json(registry);
});

// On-demand timetable for any ferry slug
router.get('/timetable/:slug', async (req, res) => {
  const { slug } = req.params;
  const force = req.query.refresh === 'true' || req.query.force === 'true';
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(slug)) {
    return res.status(400).json({ error: 'Invalid slug' });
  }
  try {
    const data = await getTimetable(slug, force);
    recordFerryView(slug, req);
    res.setHeader('Cache-Control', 'no-cache');
    res.json(data);
  } catch (err) {
    const isNotFound = err.message.startsWith('Unknown ferry slug');
    console.error(`[api] GET /timetable/${slug} error:`, err.message);
    res.status(isNotFound ? 404 : 503).json({ error: isNotFound ? `Unknown ferry: ${slug}` : 'Timetable not available' });
  }
});

export function assessRoutes() {
  const registry = loadRegistry();
  const totalFerries = registry?.ferries?.length ?? 0;
  let totalVariants = 0;
  if (registry?.ferries) {
    for (const f of registry.ferries) {
      totalVariants += f.variants?.length ?? 0;
    }
  }

  let cachedCount = 0;
  let freshCount = 0;
  let dormantCount = 0;
  let errorCount = 0;
  const failedSlugs = [];

  try {
    if (fs.existsSync(TIMETABLES_DIR)) {
      const files = fs.readdirSync(TIMETABLES_DIR).filter((f) => f.endsWith('.json'));
      cachedCount = files.length;
      const now = Date.now();

      for (const file of files) {
        const slug = file.replace(/\.json$/, '');
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(TIMETABLES_DIR, file), 'utf8'));
          const scraperStatus = raw?.metadata?.scraperStatus;
          const scraped = raw?.metadata?.lastScrapedAt;

          if (scraperStatus !== 'success') {
            errorCount++;
            failedSlugs.push(slug);
            continue;
          }

          if (scraped && now - new Date(scraped).getTime() < TIMETABLE_TTL_MS) {
            freshCount++;
          } else {
            // Older timetable files are expected: only Skåldö refreshes daily;
            // other routes refresh on request after 24 hours.
            dormantCount++;
          }
        } catch {
          errorCount++;
          failedSlugs.push(slug);
        }
      }
    }
  } catch (err) {
    console.error('[health] Failed to inspect timetables directory:', err.message);
  }

  return {
    totalFerries,
    totalVariants,
    cached: cachedCount,
    fresh: freshCount,
    dormant: dormantCount,
    errors: errorCount,
    failedSlugs,
  };
}

router.get('/health', (_req, res) => {
  const registry = loadRegistry();
  const registryFresh = isRegistryFresh();
  let timetableStatus = 'unknown';
  let lastScrapedAt = null;
  let timetableFresh = false;
  let ageHours = null;

  try {
    const raw = JSON.parse(fs.readFileSync(TIMETABLE_PATH, 'utf8'));
    lastScrapedAt = raw?.metadata?.lastScrapedAt ?? null;
    const scraperStatus = raw?.metadata?.scraperStatus;

    if (lastScrapedAt) {
      const ageMs = Date.now() - new Date(lastScrapedAt).getTime();
      ageHours = Math.round((ageMs / (1000 * 60 * 60)) * 10) / 10;
      timetableFresh = ageMs >= 0 && ageMs < SKALDO_FRESH_TTL_MS;
    }

    if (scraperStatus === 'success') {
      timetableStatus = timetableFresh ? 'ok' : 'stale';
    } else {
      timetableStatus = 'error';
    }
  } catch {
    timetableStatus = 'missing';
  }

  const routes = assessRoutes();
  const allOk = registryFresh && timetableFresh && timetableStatus === 'ok' && routes.errors === 0;

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    time: new Date().toISOString(),
    registry: {
      available: !!registry,
      fresh: registryFresh,
      ferries: registry?.ferries?.length ?? 0,
      lastUpdated: registry?.lastUpdated ?? null,
    },
    timetable: {
      status: timetableStatus,
      fresh: timetableFresh,
      lastScrapedAt,
      ageHours,
    },
    routes,
  });
});

// Manual rescrape trigger — requires X-Refresh-Token header matching REFRESH_TOKEN env var
router.post('/refresh', async (req, res) => {
  const token = process.env.REFRESH_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'Refresh endpoint is disabled (REFRESH_TOKEN not set)' });
  }
  if (req.headers['x-refresh-token'] !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await runScraper();
    const raw = fs.readFileSync(TIMETABLE_PATH, 'utf8');
    res.json({ ok: true, data: JSON.parse(raw) });
  } catch (err) {
    console.error('[api] POST /refresh error:', err.message);
    res.status(500).json({ ok: false, error: 'Refresh failed' });
  }
});

// Client-side analytics beacon — no auth required, data is already non-personal
const ALLOWED_VIEWPORTS = new Set(['<480', '480-767', '768-1199', '1200+']);
const ALLOWED_COLOR_SCHEMES = new Set(['dark', 'light']);
const ALLOWED_DISPLAY_MODES = new Set(['standalone', 'browser']);
const ALLOWED_CONN_TYPES = new Set(['slow-2g', '2g', '3g', '4g']);
const ALLOWED_TTI_BUCKETS = new Set(['<500ms', '500ms-1s', '1s-3s', '>3s']);

router.post('/beacon', (req, res) => {
  const { viewport, colorScheme, displayMode, connectionType, ttiBucket } = req.body ?? {};
  recordClientInfo(
    {
      viewport: ALLOWED_VIEWPORTS.has(viewport) ? viewport : null,
      colorScheme: ALLOWED_COLOR_SCHEMES.has(colorScheme) ? colorScheme : null,
      displayMode: ALLOWED_DISPLAY_MODES.has(displayMode) ? displayMode : null,
      connectionType: ALLOWED_CONN_TYPES.has(connectionType) ? connectionType : null,
      ttiBucket: ALLOWED_TTI_BUCKETS.has(ttiBucket) ? ttiBucket : null,
    },
    req,
  );
  res.status(204).end();
});

// Protected analytics endpoint — requires Authorization: Bearer <ANALYTICS_TOKEN>
router.get('/analytics', (req, res) => {
  const token = process.env.ANALYTICS_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'Analytics endpoint is disabled (ANALYTICS_TOKEN not set)' });
  }
  const authHeader = req.headers['authorization'] ?? '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (provided !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const data = aggregateAnalytics();
    res.setHeader('Cache-Control', 'no-store');
    res.json(data);
  } catch (err) {
    console.error('[api] GET /analytics error:', err.message);
    res.status(500).json({ error: 'Failed to aggregate analytics' });
  }
});

export default router;
