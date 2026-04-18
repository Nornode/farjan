# Färjan

Self-hosted ferry timetable checker for all Finnish public ferries. Scrapes [finferries.fi](https://www.finferries.fi), caches timetables locally, and shows a live departure countdown for any available ferry route.

<p align="center">
  <img src="docs/main-page-dark.png" alt="Countdown view" width="48%" />
  &nbsp;
  <img src="docs/metadata-light.png" alt="Info view" width="48%" />
</p>

> **Keywords:** Finnish ferry timetable · Finferries · Skåldö · Skärgård · färjetrafik · färja tidtabell · lauttaaikataulu · saaristoliikenteen aikataulu · self-hosted · open source · departure countdown · React · Docker · Node.js

---

## Table of contents

- [Färjan](#färjan)
  - [Table of contents](#table-of-contents)
  - [Quick start](#quick-start)
  - [Features](#features)
  - [Configuration](#configuration)
  - [Persistent data](#persistent-data)
  - [Disclaimer](#disclaimer)
  - [Docs](#docs)
  - [På svenska](#på-svenska)
  - [Suomeksi](#suomeksi)

---

## Quick start

```bash
./rebuild.sh
```

Opens at **http://localhost:3000**. The script stops any existing container, builds a fresh image, and starts it with persistent storage at `./data`.

> Requires Docker. See the [Development guide](docs/development.md) for running without Docker.

---

## Features

- Live countdown to next departure (switches to seconds in the final minute, urgency colours)
- All Finnish public ferries selectable via dropdown — timetables loaded on demand and cached
- Break periods shown with the next departure after the break
- Weekday / weekend variants auto-selected based on current day
- Dark and light theme, persisted in `localStorage`
- Mobile-first horizontal layout optimised for one-handed use
- SVG favicon — MDI ferry icon in navy and mint
- Ferry registry rebuilt weekly; individual timetables cached 24 h

---

## Configuration

| Variable   | Default           | Description                         |
|------------|-------------------|-------------------------------------|
| `PORT`     | `3000`            | HTTP port the server listens on     |
| `DATA_DIR` | `/data`           | Path to the persistent data volume  |
| `TZ`       | `Europe/Helsinki` | Timezone used by the cron scheduler |

Set variables in `docker-compose.yml` or pass them to `docker run -e`.

```bash
PORT=8080 ./rebuild.sh
```

---

## Persistent data

All state lives in `./data` (bind-mounted into the container at `/data`).

| File | Updated | Description |
|------|---------|-------------|
| `timetable.json` | Daily 01:07 | Skåldö timetable (legacy, kept for compatibility) |
| `ferries.json` | Monday 01:15 | Registry of all verified ferry routes |
| `timetables/<slug>.json` | On first request, then every 24 h | Per-ferry timetable cache |

The container is stateless — delete any file to force a fresh scrape on next startup or request.

---

## Disclaimer

This project is an **independent, non-commercial tool** with no affiliation to [Finferries](https://www.finferries.fi) or Traficom. Timetable data is scraped from finferries.fi and may contain errors. Always verify departure times through official sources before travelling.

Developed entirely by AI — [Claude (claude-sonnet-4-6)](https://www.anthropic.com) by Anthropic, using [Claude Code](https://claude.ai/code).

Source: [github.com/Nornode/farjan](https://github.com/Nornode/farjan)

---

## Docs

- [API reference](docs/api.md)
- [Development guide](docs/development.md)

---

## På svenska

**Färjan** är ett självhostat tidtabellsverktyg för alla Finlands offentliga färjor. Applikationen hämtar tidtabellsdata automatiskt från [finferries.fi](https://www.finferries.fi), sparar den lokalt i en cache och visar en realtidsnedräkning till nästa avgång för den valda färjerutten.

**Centrala funktioner:**
- Alla Finferries-färjor valbara via rullgardinsmeny
- Nedräkning till nästa avgång, sekunders precision i sista minuten
- Uppehåll och avvikelser visas automatiskt
- Vardag- och veckoslutstidtabeller väljs automatiskt baserat på dag
- Mörkt och ljust tema

**Sökord:** `färja tidtabell` · `Finferries` · `Skåldö` · `skärgårdstrafik` · `färjetur` · `färjeapp` · `Docker` · `React` · `självhostad tjänst` · `färjeöverfart` · `Traficom`

---

## Suomeksi

**Färjan** on itseisännöity aikataululukija Suomen julkisille lautoille. Sovellus hakee aikataulutiedot automaattisesti [finferries.fi](https://www.finferries.fi)-sivustolta, tallentaa ne paikallisesti välimuistiin ja näyttää reaaliaikaisen lähtölaskennan valitulle lauttareitille.

**Keskeiset ominaisuudet:**
- Kaikki Finferries-lautat valittavissa pudotusvalikosta
- Seuraavaan lähtöön lasketaan aika sekunnin tarkkuudella
- Tauot ja poikkeusajat näytetään automaattisesti
- Arki- ja viikonloppuaikataulut valitaan päivän mukaan
- Tumma ja vaalea teema

**Hakusanat:** `lautta-aikataulu` · `Finferries` · `Skåldö` · `saaristoliikenteen aikataulu` · `lauttayhteys` · `lautta-app` · `Docker` · `React` · `itseisännöity palvelu` · `lossiyhteys` · `Traficom`
