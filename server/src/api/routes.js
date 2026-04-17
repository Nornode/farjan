import express from 'express';
import fs from 'fs';
import path from 'path';
import { runScraper } from '../scraper.js';

const router = express.Router();
const DATA_DIR = process.env.DATA_DIR || '/data';
const TIMETABLE_PATH = path.join(DATA_DIR, 'timetable.json');

router.get('/timetable', (_req, res) => {
  try {
    const raw = fs.readFileSync(TIMETABLE_PATH, 'utf8');
    res.setHeader('Cache-Control', 'no-cache');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(503).json({ error: 'Timetable not available yet', detail: err.message });
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
