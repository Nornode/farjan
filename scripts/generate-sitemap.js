#!/usr/bin/env node
/**
 * Generate sitemap.xml from the ferry registry
 * Includes Swedish character variants with hreflang canonical links
 * Usage: node scripts/generate-sitemap.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'client', 'public', 'sitemap.xml');
const DATA_DIR = path.join(__dirname, '..', 'data');
const FERRIES_PATH = path.join(DATA_DIR, 'ferries.json');

// Convert ferry name to URL-friendly format (ASCII - canonical)
function ferryNameToAsciiUrl(name) {
  return name
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Convert ferry name to URL-friendly format (Swedish characters)
function ferryNameToSwedishUrl(name) {
  return name
    .toLowerCase()
    .replace(/[^a-zåäö0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Generate hreflang links for a URL pair
// Note: Finnish (fi) names are currently the same as Swedish (sv-SE)
// TODO: Verify with finferries.fi/fi if Finnish route names differ from Swedish
function generateHrefLangLinks(asciiUrl, swedishUrl) {
  let hreflang = `    <xhtml:link rel="alternate" hreflang="sv" href="https://farjan.lagus.net${asciiUrl}"/>\n`;
  if (swedishUrl && swedishUrl !== asciiUrl) {
    hreflang += `    <xhtml:link rel="alternate" hreflang="sv-SE" href="https://farjan.lagus.net${swedishUrl}"/>\n`;
    hreflang += `    <xhtml:link rel="alternate" hreflang="sv-FI" href="https://farjan.lagus.net${swedishUrl}"/>\n`;
    hreflang += `    <xhtml:link rel="alternate" hreflang="fi" href="https://farjan.lagus.net${swedishUrl}"/>\n`;
  } else {
    hreflang += `    <xhtml:link rel="alternate" hreflang="sv-SE" href="https://farjan.lagus.net${asciiUrl}"/>\n`;
    hreflang += `    <xhtml:link rel="alternate" hreflang="sv-FI" href="https://farjan.lagus.net${asciiUrl}"/>\n`;
    hreflang += `    <xhtml:link rel="alternate" hreflang="fi" href="https://farjan.lagus.net${asciiUrl}"/>\n`;
  }
  hreflang += `    <xhtml:link rel="alternate" hreflang="en" href="https://farjan.lagus.net${asciiUrl}"/>`;
  return hreflang;
}

async function generateSitemap() {
  try {
    console.log('[sitemap] Reading ferries from', FERRIES_PATH);

    if (!fs.existsSync(FERRIES_PATH)) {
      console.warn('[sitemap] ferries.json not found. Trying API...');
      return generateFromAPI();
    }

    const data = JSON.parse(fs.readFileSync(FERRIES_PATH, 'utf-8'));
    const ferries = data.ferries || [];

    console.log(`[sitemap] Found ${ferries.length} ferries`);

    // Build URLs with both ASCII (canonical) and Swedish variants
    const urls = [];

    // Root URL
    urls.push({
      ascii: '/',
      swedish: null,
      name: 'Home',
      priority: '1.0',
    });

    // Add each ferry route with variants
    ferries.forEach((ferry) => {
      const ascii = `/${ferry.id}`;
      const swedish = ferryNameToSwedishUrl(ferry.name);
      const swedishUrl = swedish !== ferry.id ? `/${swedish}` : null;

      urls.push({
        ascii,
        swedish: swedishUrl,
        name: ferry.name,
        priority: '0.9',
      });
    });

    console.log(`[sitemap] Generated ${urls.length} ferry entries with Swedish variants`);

    // Build XML string
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    urls.forEach((url) => {
      xml += '  <url>\n';
      xml += `    <loc>https://farjan.lagus.net${url.ascii}</loc>\n`;
      xml += `    <changefreq>${url.priority === '1.0' ? 'weekly' : 'weekly'}</changefreq>\n`;
      xml += `    <priority>${url.priority}</priority>\n`;

      // Add hreflang for language/variant annotations
      if (url.name !== 'Home') {
        xml += `${generateHrefLangLinks(url.ascii, url.swedish)}\n`;
      }

      xml += '  </url>\n';

      // Add Swedish variant as separate URL if it exists
      if (url.swedish && url.swedish !== url.ascii) {
        xml += '  <url>\n';
        xml += `    <loc>https://farjan.lagus.net${url.swedish}</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>${url.priority}</priority>\n`;
        xml += `    <xhtml:link rel="canonical" href="https://farjan.lagus.net${url.ascii}"/>\n`;
        xml += '  </url>\n';
      }
    });

    xml += '</urlset>\n';

    // Write file
    fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8');

    const totalUrls = urls.length + urls.filter(u => u.swedish && u.swedish !== u.ascii).length;
    console.log(`[sitemap] Wrote ${totalUrls} total URLs (${urls.length} canonical + ${totalUrls - urls.length} Swedish variants) to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('[sitemap] Error:', err.message);
    process.exit(1);
  }
}

async function generateFromAPI() {
  try {
    const API_URL = process.env.API_URL || 'http://localhost:3000';
    console.log('[sitemap] Fetching ferries from', API_URL);
    const response = await fetch(`${API_URL}/api/ferries`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const ferries = data.ferries || [];

    console.log(`[sitemap] Found ${ferries.length} ferries`);

    const urls = [];
    urls.push({ ascii: '/', swedish: null, name: 'Home', priority: '1.0' });

    ferries.forEach((ferry) => {
      const ascii = `/${ferry.id}`;
      const swedishUrl = ferryNameToSwedishUrl(ferry.name);
      const swedish = swedishUrl !== ferry.id ? `/${swedishUrl}` : null;

      urls.push({
        ascii,
        swedish,
        name: ferry.name,
        priority: '0.9',
      });
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    urls.forEach((url) => {
      xml += '  <url>\n';
      xml += `    <loc>https://farjan.lagus.net${url.ascii}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${url.priority}</priority>\n`;

      if (url.name !== 'Home') {
        xml += `${generateHrefLangLinks(url.ascii, url.swedish)}\n`;
      }

      xml += '  </url>\n';

      if (url.swedish && url.swedish !== url.ascii) {
        xml += '  <url>\n';
        xml += `    <loc>https://farjan.lagus.net${url.swedish}</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>${url.priority}</priority>\n`;
        xml += `    <xhtml:link rel="canonical" href="https://farjan.lagus.net${url.ascii}"/>\n`;
        xml += '  </url>\n';
      }
    });

    xml += '</urlset>\n';

    fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8');
    const totalUrls = urls.length + urls.filter(u => u.swedish && u.swedish !== u.ascii).length;
    console.log(`[sitemap] Wrote ${totalUrls} total URLs to ${OUTPUT_PATH}`);
  } catch (err) {
    console.error('[sitemap] Error:', err.message);
    process.exit(1);
  }
}

generateSitemap();
