import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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

// Security headers — CSP disabled: Helmet's defaults break Vite's module scripts
// and upgrade-insecure-requests breaks plain HTTP access on port 3000.
// All other headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.) are kept.
app.use(helmet({ contentSecurityPolicy: false }));

// Rate limiting: 60 requests per minute per IP on all API routes
app.use('/api', rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false }));

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
    else if (req.path !== '/health') console.log(line);
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

// Run scraper on startup, then init registry
console.log('[startup] Running initial timetable scrape...');
const server = app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});

runScraper()
  .then(() => {
    console.log('[startup] Initial scrape complete.');
    return ensureRegistry();
  })
  .catch((err) => console.error('[startup] Startup sequence failed:', err.message));

startScheduler();

// Graceful shutdown
const shutdown = (signal) => () => {
  console.log(`[server] ${signal} received — shutting down`);
  server.close(() => {
    console.log('[server] Shutdown complete');
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));
