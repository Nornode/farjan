import express from 'express';
import fs from 'fs';
import path from 'path';
import { runScraper } from '../scraper.js';
import { loadRegistry, isRegistryFresh } from '../ferryRegistry.js';
import { getTimetable } from '../timetableCache.js';
import { DATA_DIR } from '../config.js';
import { recordFerryView, aggregateAnalytics } from '../analytics.js';

const router = express.Router();
const TIMETABLE_PATH = path.join(DATA_DIR, 'timetable.json');

// Backward-compat: Skåldö timetable
router.get('/timetable', (_req, res) => {
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
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(slug)) {
    return res.status(400).json({ error: 'Invalid slug' });
  }
  try {
    const data = await getTimetable(slug);
    recordFerryView(slug, req);
    res.setHeader('Cache-Control', 'no-cache');
    res.json(data);
  } catch (err) {
    const isNotFound = err.message.startsWith('Unknown ferry slug');
    console.error(`[api] GET /timetable/${slug} error:`, err.message);
    res.status(isNotFound ? 404 : 503).json({ error: isNotFound ? `Unknown ferry: ${slug}` : 'Timetable not available' });
  }
});

router.get('/health', (_req, res) => {
  const registry = loadRegistry();
  const registryFresh = isRegistryFresh();
  let timetableStatus = 'unknown';
  let lastScrapedAt = null;
  try {
    const raw = JSON.parse(fs.readFileSync(TIMETABLE_PATH, 'utf8'));
    lastScrapedAt = raw?.metadata?.lastScrapedAt ?? null;
    const scraperStatus = raw?.metadata?.scraperStatus;
    timetableStatus = scraperStatus === 'success' ? 'ok' : 'error';
  } catch {
    timetableStatus = 'missing';
  }
  const allOk = registryFresh && timetableStatus === 'ok';
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
      lastScrapedAt,
    },
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
