import express from 'express';
import fs from 'fs';
import path from 'path';
import { runScraper } from '../scraper.js';
import { loadRegistry } from '../ferryRegistry.js';
import { getTimetable } from '../timetableCache.js';

const router = express.Router();
const DATA_DIR = process.env.DATA_DIR || '/data';
const TIMETABLE_PATH = path.join(DATA_DIR, 'timetable.json');

// Backward-compat: Skåldö timetable
router.get('/timetable', (_req, res) => {
  try {
    const raw = fs.readFileSync(TIMETABLE_PATH, 'utf8');
    res.setHeader('Cache-Control', 'no-cache');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(503).json({ error: 'Timetable not available yet', detail: err.message });
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
  try {
    const data = await getTimetable(slug);
    res.setHeader('Cache-Control', 'no-cache');
    res.json(data);
  } catch (err) {
    const status = err.message.startsWith('Unknown ferry slug') ? 404 : 503;
    res.status(status).json({ error: err.message });
  }
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Manual rescrape trigger (useful for testing)
router.post('/refresh', async (_req, res) => {
  try {
    await runScraper();
    const raw = fs.readFileSync(TIMETABLE_PATH, 'utf8');
    res.json({ ok: true, data: JSON.parse(raw) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
