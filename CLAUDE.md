# Färjan - Finnish Ferry Timetable Tracker

## Project Overview

A self-hosted web app that scrapes finferries.fi timetables and displays live departure countdowns. Supports all ~15 Finnish public ferry routes. Deployed at https://farjan.lagus.net/

## Tech Stack

- **Frontend:** React 18, React Router v6, Tailwind CSS, Vite
- **Backend:** Node.js (ESM), Express, Cheerio, node-cron
- **Runtime:** Docker (Node 20-Alpine), timezone Europe/Helsinki
- **Security:** Helmet.js, express-rate-limit (60 req/min per IP)

## Local Development

```bash
# Terminal 1: Backend
cd server && npm install && npm run dev

# Terminal 2: Frontend
cd client && npm install && npm run dev
```

Vite proxies `/api/*` to `http://localhost:3000` (see `client/vite.config.js`). Both must be running.

## Key Architecture

- `server/src/scraper.js` — Cheerio-based HTML parser for finferries.fi
- `server/src/timetableCache.js` — 24h per-ferry file cache under `data/timetables/`
- `server/src/ferryRegistry.js` — Weekly discovery of all ferry routes
- `server/src/scheduler.js` — Cron: daily Skåldö refresh (01:07), weekly registry (Mon 01:15)
- `client/src/hooks/timeUtils.js` — Countdown math, break period resolution, variant selection
- `client/src/pages/MainCountdown.jsx` — Primary UI: two-panel departure countdown

## Conventions

- All modules use ESM (`import`/`export`, no CommonJS)
- Frontend components: functional React with hooks, no class components
- Styling: Tailwind utility classes only, no CSS modules
- Data directory: `./data` locally, `/data` in container (mounted volume)
- Swedish characters in URLs (åäö) redirect to ASCII canonical (`client/src/utils/swedishVariants.js`)

## Important Constraints

- **Polite scraping:** Never poll finferries.fi outside scheduled cron jobs. All user requests served from cache.
- **No Docker in dev sessions:** User handles container lifecycle manually via `rebuild.sh`
- **Privacy:** Analytics use SHA-256 hashed IPs, never raw IPs. Fully optional via `LOG_ANALYTICS=false`.
- **Layout rule:** `h-screen flex flex-col overflow-hidden` — scrollable children need `overflow-y-auto` and `min-h-0` on flex-1 parents.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | 3000 | Server port |
| `DATA_DIR` | `./data` (dev) / `/data` (Docker) | Persistent storage |
| `TZ` | `Europe/Helsinki` | Cron timezone |
| `ANALYTICS_TOKEN` | unset | Enables analytics dashboard |
| `LOG_ANALYTICS` | true | Toggle event recording |
| `REFRESH_TOKEN` | unset | Manual `/api/refresh` trigger |

## API Endpoints

- `GET /api/health` — Health check
- `GET /api/ferries` — Ferry registry (all routes)
- `GET /api/timetable/:slug` — Timetable for specific ferry
- `GET /api/metadata/:slug` — Scrape metadata
- `GET /api/analytics` — Dashboard (requires ANALYTICS_TOKEN)
- `POST /api/refresh` — Manual cache refresh (requires REFRESH_TOKEN)

## Testing

Run backend tests:
```bash
cd server && npm test
```

Validate changes end-to-end by:
1. Running the dev servers and checking the countdown UI
2. Verifying API responses with `curl http://localhost:3000/api/health`
3. Checking the browser console for errors
