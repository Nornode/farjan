# Swedish Character URL Support (åäö) + Multilingual SEO

Färjan supports all ferries with Swedish character URLs and proper multilingual hreflang tags for search engines. Skåldö is the default/canonical ferry.

## Implementation Summary

### 1. **URL Variants Generated**
Each ferry has both canonical and user-friendly variants:
- **Canonical (ASCII):** `/skaldo` ← Default, main site, search engines index this
- **User-friendly (Swedish):** `/skåldö` ← Redirects to canonical

**All ferries with Swedish variants:**
```
skaldo       ↔ skåldö       (Skåldö)
barosund     ↔ barösund     (Barösund)
hogsara      ↔ högsåra      (Högsåra)
inio-gustavs ↔ iniö-gustavs (Iniö-Gustavs)
karlo-hailuoto ↔ karlö-hailuoto (Karlö)
kasnas-hitis-aurora ↔ kasnäs-hitis-aurora (Kasnäs - Hitis - Aurora)
keistio      ↔ keistiö      (Keistiö)
skargardens-ringvag-houtskar-inio ↔ skärgårdens-ringväg-houtskär-iniö (Skärgårdens Ringväg)
```

### 2. **Default Behavior**
- **Home page:** `/` → Defaults to Skåldö countdown
- **Picker:** Shows all ferries, Skåldö selected by default
- **Navigation:** All ferries selectable and bookmarkable

### 3. **Language Support (hreflang)**

Each canonical URL declares language variants for search engines:

```xml
<url>
  <loc>https://farjan.lagus.net/barosund</loc>
  
  <xhtml:link rel="alternate" hreflang="sv" href="https://farjan.lagus.net/barosund"/>
  <!-- Swedish (generic) → ASCII canonical -->
  
  <xhtml:link rel="alternate" hreflang="sv-SE" href="https://farjan.lagus.net/barösund"/>
  <!-- Swedish (Sweden) → Swedish characters -->
  
  <xhtml:link rel="alternate" hreflang="sv-FI" href="https://farjan.lagus.net/barösund"/>
  <!-- Swedish (Finland/minority) → Swedish characters (same as sv-SE) -->
  
  <xhtml:link rel="alternate" hreflang="fi" href="https://farjan.lagus.net/barösund"/>
  <!-- Finnish → Swedish characters (same as Swedish for now) -->
  <!-- TODO: Verify if Finnish route names differ from Swedish at finferries.fi/fi -->
  
  <xhtml:link rel="alternate" hreflang="en" href="https://farjan.lagus.net/barosund"/>
  <!-- English → ASCII canonical -->
</url>
```

Swedish variant URLs also declare canonical:
```xml
<url>
  <loc>https://farjan.lagus.net/barösund</loc>
  <xhtml:link rel="canonical" href="https://farjan.lagus.net/barosund"/>
</url>
```

### 4. **Dynamic Routing**
**File:** `client/src/App.jsx`
- Route handler catches ALL Swedish character URLs
- Automatically normalizes to ASCII canonical
- No hardcoding needed - works for any future ferries added

**Example flow:**
```
User visits: farjan.lagus.net/skåldö
   ↓
Router catches via catch-all route
   ↓
normalizeToFerryId('skåldö') → 'skaldo'
   ↓
Navigate to /skaldo
   ↓
Component renders with canonical URL
```

### 5. **Sitemap Structure**
**File:** `client/public/sitemap.xml`
- **24 total URLs:** 16 canonical + 8 Swedish variants
- **Each canonical URL includes hreflang tags** for all language variants
- **Each Swedish variant has canonical link** pointing back to ASCII

Run to regenerate:
```bash
npm run generate-sitemap  # from client/
```

## SEO Benefits

| Benefit | How it works |
|---------|-------------|
| **User-friendly URLs** | Type `/skåldö` naturally, browser handles it |
| **Default site clarity** | Skåldö is canonical/default, clearly indexed |
| **Better discoverability** | Crawlers find both ASCII and Swedish variants |
| **Duplicate content prevention** | Canonical links tell Google which version is primary |
| **Language targeting** | hreflang tells Google about Swedish, Finnish, English users |
| **Swedish minority support** | sv-FI tag recognizes Swedish-speaking Finland population |
| **No URL encoding confusion** | Browser handles `/skåldö` → `/sk%C3%A5ld%C3%B6` transparently |

## Language Tag Meanings

| Tag | Meaning | URL |
|-----|---------|-----|
| `sv` | Swedish (generic/formal) | `/barosund` (ASCII) |
| `sv-SE` | Swedish (Sweden) | `/barösund` (Swedish chars) |
| `sv-FI` | Swedish (Finland minority) | `/barösund` (Swedish chars) |
| `fi` | Finnish | `/barösund` (Swedish chars for now) |
| `en` | English | `/barosund` (ASCII) |

**Note:** Finnish (fi) currently uses Swedish names. This should be verified at finferries.fi/fi to confirm if route names differ.

## Testing

**Try these URLs** (all work and redirect/render properly):
```bash
# ASCII canonical (preferred by search engines)
curl -i https://farjan.lagus.net/barosund
curl -i https://farjan.lagus.net/hogsara
curl -i https://farjan.lagus.net/skaldo

# Swedish variants (redirect to ASCII)
curl -i https://farjan.lagus.net/barösund
curl -i https://farjan.lagus.net/högsåra
curl -i https://farjan.lagus.net/skåldö

# Check hreflang in sitemap
curl https://farjan.lagus.net/sitemap.xml | grep -A 10 "barosund"
```

## Future: Verify Finnish Names

When finferries.fi/fi pages are confirmed to have different route names:
1. Update backend scraper to collect Finnish names from finferries.fi/fi
2. Add `finnish_name` field to ferries.json
3. Generate Finnish URL variants in sitemap generator
4. Update hreflang `fi` tag to point to Finnish URLs
5. Update router to redirect Finnish variants to ASCII canonical

For now, Finnish and Swedish use the same URL to avoid maintaining stale data.

## Maintenance

When new ferries are added to finferries.fi:

```bash
# 1. Server scraper updates data/ferries.json automatically
# 2. Next rebuild regenerates sitemap with all variants
./rebuild.sh  # Calls npm run generate-sitemap automatically
# 3. New ferries appear in all language variants
```

No manual configuration needed!

