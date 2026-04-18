import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { runScraper } from './scraper.js';
import { startScheduler } from './scheduler.js';
import { ensureRegistry } from './ferryRegistry.js';
import apiRoutes from './api/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_BUILD = path.join(__dirname, '../../client/dist');

// Static asset extensions — requests for these are not page loads
const ASSET_RE = /\.(js|css|png|jpg|jpeg|ico|svg|woff|woff2|ttf|map|webmanifest)(\?.*)?$/i;

// Resolve real client IP, respecting X-Forwarded-For from reverse proxies
function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  const ip = clientIp(req);

  // Detect HTML page loads: not an asset, not an API call, client accepts HTML
  const isPageLoad =
    !ASSET_RE.test(req.path) &&
    !req.path.startsWith('/api') &&
    (req.headers['accept'] ?? '').includes('text/html');

  if (isPageLoad) {
    console.log(`[page] Load from ${ip} — ${req.headers['user-agent'] ?? 'unknown'}`);
  }

  res.on('finish', () => {
    const ms = Date.now() - start;
    const line = `[http] ${res.statusCode} ${req.method} ${req.path} — ${ip} (${ms}ms)`;
    if (res.statusCode >= 500) console.error(line);
    else if (res.statusCode >= 400) console.warn(line);
    else console.log(line);
  });

  next();
});

app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Serve React build (static assets + SPA fallback)
app.use(express.static(CLIENT_BUILD));
app.get('*', (_req, res) => {
  res.sendFile(path.join(CLIENT_BUILD, 'index.html'));
});

// Run scraper on startup, then start the daily scheduler
console.log('[startup] Running initial timetable scrape...');
runScraper()
  .then(() => console.log('[startup] Initial scrape complete.'))
  .catch((err) => console.error('[startup] Initial scrape failed:', err.message));

// Build ferry registry on startup if missing or stale (>7 days)
ensureRegistry().catch((err) => console.error('[startup] Registry init failed:', err.message));

startScheduler();

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
