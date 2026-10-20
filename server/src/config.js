import fs from 'fs';
import path from 'path';

function resolveDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (fs.existsSync(path.resolve(process.cwd(), 'data'))) return path.resolve(process.cwd(), 'data');
  if (fs.existsSync(path.resolve(process.cwd(), '../data'))) return path.resolve(process.cwd(), '../data');
  return '/data';
}

export const DATA_DIR = resolveDataDir();
export const TIMETABLE_TTL_MS = 24 * 60 * 60 * 1000;   // 24 hours
export const REGISTRY_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SCRAPER_TIMEOUT_MS = 15_000;
export const VERIFY_CONCURRENCY = 5;
