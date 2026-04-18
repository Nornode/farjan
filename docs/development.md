# Development Guide

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router, Tailwind CSS, Vite |
| Backend | Node.js (ESM), Express |
| Scraping | Cheerio, node-fetch |
| Scheduling | node-cron |
| Runtime | Docker, Node 20-Alpine |

---

## Running locally (without Docker)

Start the server and the Vite dev server in separate terminals.

**Server**
```bash
cd server
npm install
node --watch src/index.js   # or: npm start
```

The server listens on port 3000 and reads/writes `./data` by default. Override with `DATA_DIR=./data`.

**Client**
```bash
cd client
npm install
npm run dev   # Vite dev server on http://localhost:5173
```

Vite proxies `/api/*` to `http://localhost:3000` (configured in `vite.config.js`). You must have the server running.

---

## Project layout

```
färjan/
├── client/src/
│   ├── App.jsx                   # Root — owns ferry selector state
│   ├── components/
│   │   ├── Countdown.jsx         # Departure countdown row
│   │   ├── FerrySelector.jsx     # Dropdown in the nav bar
│   │   └── Nav.jsx               # Top navigation bar
│   ├── hooks/
│   │   ├── useFerryData.js       # Fetch timetable for a slug
│   │   ├── useFerrySelector.js   # Ferry list + selected ferry state
│   │   ├── useTheme.js           # Dark/light theme toggle
│   │   └── timeUtils.js          # Countdown math, break resolution
│   └── pages/
│       ├── MainCountdown.jsx     # Two-panel countdown view
│       └── Metadata.jsx          # Scrape info + full departure list
│
└── server/src/
    ├── index.js                  # Express setup, startup sequence
    ├── api/routes.js             # All HTTP endpoints
    ├── scraper.js                # HTML fetch + parse; Skåldö daily scraper
    ├── ferryRegistry.js          # Ferry discovery from main finferries page
    ├── timetableCache.js         # 24 h per-ferry cache layer
    └── scheduler.js              # Cron jobs
```

---

## How scraping and caching works

The app is designed to be a **polite, low-frequency consumer** of finferries.fi. The vast majority of requests are served entirely from local cache files — finferries.fi is contacted as rarely as possible.

### Three layers of caching

```
Browser request
      │
      ▼
 timetableCache.js
      │
      ├─ slug file exists and < 24 h old? ──► return file immediately (no network call)
      │
      ├─ slug matches legacy timetable.json and < 24 h old? ──► seed file, return immediately
      │
      └─ stale or missing ──► scrape finferries.fi once, write file, return
```

1. **Per-ferry timetable cache** — `data/timetables/<slug>.json`
   - Written the first time a ferry is requested, or after the daily Skåldö refresh.
   - Served as-is for **24 hours** before a new scrape is triggered.
   - A ferry you never select is **never scraped**.

2. **Skåldö legacy file** — `data/timetable.json`
   - Refreshed once per day at **01:07** Helsinki time via cron.
   - On startup the server also writes this data into the slug cache so the first page load for Skåldö never requires an extra network call.

3. **Ferry registry** — `data/ferries.json`
   - Built once at startup if the file is missing or older than 7 days.
   - Otherwise loaded from disk — no network call.
   - Rebuilt automatically every **Monday at 01:15** Helsinki time.

### What this means in practice

| Event | Network calls to finferries.fi |
|-------|-------------------------------|
| Normal page load | **0** — all data served from cache |
| First request for a new ferry | **1** — timetable page for that ferry only |
| Daily cron at 01:07 | **1** — Skåldö timetable page only |
| Weekly cron on Monday | **~15–20** — one per verified ferry, to check they still have data |
| Registry missing on startup | **~50–100** — full discovery scan, happens once per week at most |

The app never polls or re-fetches in the background between these scheduled events.

### How the HTML is parsed

Each finferries.fi timetable page is a **static HTML page** — no JavaScript rendering or API needed.

- Departure times live in `<ul class="pick_ferry_line__detail_window__times"><li>HH:MM</li>…`
- The terminal name comes from the `<h4>` heading before each list — headings containing `saari`/`ö)` map to `island`; `mantere`/`fastland` map to `mainland`
- Break periods are parsed from a `<p>` element containing *Tauot / Pauser / Breaks*
- Validity date comes from `.effective_header`
- The list of all ferry routes is found on the main listing page via `<a data-timetable-url="...">` elements — each element is one logical ferry; comma-separated URLs in the attribute are weekday/weekend variants of the same route

`useFerrySelector` (in `App.jsx`) fetches `/api/ferries` once on mount and stores the selected ferry ID in `localStorage` under the key `farjan_ferry`. Skåldö (`skaldo`) is the default.

When a ferry has multiple variants, the active variant is chosen automatically:

| Current day | Preferred pattern |
|-------------|------------------|
| Mon–Fri | `mon-fri` |
| Saturday | `sat`, then `sat-sun` |
| Sunday | `sun`, then `sat-sun` |
| May–Sep | `summer` |
| Oct–Apr | `winter` |
| Fallback | `all`, then first variant |

---

## Rebuild script

`rebuild.sh` is a convenience wrapper for the full Docker lifecycle:

```
stop container → remove container → remove image → build (--no-cache) → run → tail logs
```

`--no-cache` is intentional — Docker's layer cache on macOS can silently serve stale client builds.

The script respects two environment variables:

```bash
PORT=8080 DATA_DIR=/mnt/ferrydata ./rebuild.sh
```

---

## Adding a new page

1. Create `client/src/pages/MyPage.jsx`
2. Add a `<Route>` in `App.jsx`
3. Add a `<NavLink>` in `Nav.jsx`

The layout (`h-screen flex flex-col overflow-hidden`) requires all flex children that scroll to have `overflow-y-auto` and all `flex-1` children in nested flex columns to have `min-h-0`.
