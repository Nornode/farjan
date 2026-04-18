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

## How the scraper works

1. **Ferry registry** (`ferryRegistry.js`)
   - Fetches the main finferries.fi listing page
   - Finds every `<a data-timetable-url="...">` element — each element is one logical ferry; the attribute may contain comma-separated URLs for weekday/weekend variants
   - Verifies each URL by checking that the timetable page contains departures in **both** directions (island ↔ mainland); single-direction or empty pages are discarded
   - Saves verified ferries to `ferries.json`; rebuilt every 7 days

2. **Timetable pages** (`scraper.js → parseTimetablePage`)
   - Each ferry has one or more static sub-pages (no JavaScript rendering needed)
   - Departure times are in `<ul class="pick_ferry_line__detail_window__times"><li>HH:MM</li>…`
   - Terminals are identified from the preceding `<h4>` heading — headings containing `saari`/`ö)` map to `island`; `mantere`/`fastland` map to `mainland`
   - Break periods are parsed from a `<p>` element containing *Tauot / Pauser / Breaks*
   - Validity date comes from `.effective_header`

3. **Timetable cache** (`timetableCache.js`)
   - Checks `data/timetables/<slug>.json`; serves it if less than 24 h old
   - If the Skåldö startup scrape already wrote a matching file, it is used immediately (no redundant fetch)
   - Otherwise scrapes live and writes the file

---

## Ferry selector (client)

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
