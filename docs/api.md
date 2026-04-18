# API Reference

Base path: `/api`

All responses are JSON. Timetable endpoints set `Cache-Control: no-cache`.

---

## Endpoints

### `GET /api/ferries`

Returns the ferry registry — all verified ferries with their timetable variants.

**Response**

```json
{
  "lastUpdated": "2026-04-17T20:00:00.000Z",
  "ferries": [
    {
      "id": "barosund",
      "name": "Barösund",
      "variants": [
        { "slug": "barosund-ma-fre-...", "url": "https://...", "dayPattern": "mon-fri" },
        { "slug": "barosund-lo-so-...", "url": "https://...", "dayPattern": "sat-sun" }
      ]
    }
  ]
}
```

**Day patterns**

| Value | Applies |
|-------|---------|
| `all` | Every day |
| `mon-fri` | Monday–Friday |
| `sat-sun` | Saturday–Sunday |
| `sat` | Saturday only |
| `sun` | Sunday only |
| `summer` | May–September |
| `winter` | October–April |

**Errors:** `503` if the registry has not been built yet.

---

### `GET /api/timetable/:slug`

Returns the timetable for a specific ferry variant. Served from cache if the file is less than 24 h old; otherwise scraped live from finferries.fi.

**Example:** `GET /api/timetable/skaldo-1.4.2026-alkaen`

**Response**

```json
{
  "metadata": {
    "lastScrapedAt": "2026-04-17T20:07:18.854Z",
    "requestedAt":   "2026-04-17T20:07:18.415Z",
    "timezone":      "Europe/Helsinki",
    "validityFrom":  "2026-04-01",
    "scraperStatus": "success",
    "errorMessage":  null,
    "breaks": [
      { "start": "11:10", "end": "11:30" }
    ],
    "timetableUrl":  "https://..."
  },
  "timetables": {
    "island":   { "location": "Skåldö (saari/ö)",         "departures": ["05:00", "05:20", "..."] },
    "mainland": { "location": "Skåldö (mantere/fastland)", "departures": ["05:05", "05:25", "..."] }
  }
}
```

**Errors:** `404` if the slug is not in the registry. `503` if scraping fails.

---

### `GET /api/timetable`

Returns the Skåldö timetable from `timetable.json`. Kept for backward compatibility — prefer the slug-based endpoint above.

**Errors:** `503` if the file does not exist yet.

---

### `GET /api/health`

```json
{ "status": "ok", "time": "2026-04-17T20:00:00.000Z" }
```

---

### `POST /api/refresh`

Triggers an immediate re-scrape of the Skåldö timetable and returns the new data. Intended for manual testing.

**Response:** same structure as `GET /api/timetable`, wrapped in `{ ok: true, data: {...} }`.

---

## Data freshness and scheduled updates

Timetable data is served from local cache files. finferries.fi is **not contacted on every request** — network calls are kept to the minimum needed to stay up to date.

| Cache file | TTL | Refreshed by |
|------------|-----|-------------|
| `data/timetables/<slug>.json` | 24 h | First request after TTL expires, or daily cron for Skåldö |
| `data/timetable.json` | 24 h | Daily cron at **01:07** Helsinki time |
| `data/ferries.json` | 7 days | Weekly cron on **Monday at 01:15** Helsinki time, or startup if missing |

A ferry that is never selected by any user is **never scraped**. The weekly registry rebuild verifies all ~15 known routes (one request each) to detect new or removed ferries.
