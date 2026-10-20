import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { getTimetable } from '../src/timetableCache.js';
import { DATA_DIR } from '../src/config.js';

describe('timetable on-demand refresh', () => {
  const slug = 'barosund-ma-fre-1.6.2024-alkaen';
  const filePath = path.join(DATA_DIR, 'timetables', `${slug}.json`);

  test('getTimetable returns cached data when forceRefresh is false', async () => {
    if (fs.existsSync(filePath)) {
      const data = await getTimetable(slug, false);
      assert.ok(data.timetables);
      assert.ok(data.metadata);
    }
  });

  test('getTimetable bypasses 24h cache when forceRefresh is true', async () => {
    if (fs.existsSync(filePath)) {
      // Set scraped timestamp to 5 minutes ago so it exceeds 10s cooldown but is within 24h
      const original = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const fiveMinAgo = new Date(Date.now() - 300_000).toISOString();
      original.metadata.lastScrapedAt = fiveMinAgo;
      fs.writeFileSync(filePath, JSON.stringify(original, null, 2), 'utf8');

      // Without force: should return the cached data with fiveMinAgo timestamp
      const cached = await getTimetable(slug, false);
      assert.strictEqual(cached.metadata.lastScrapedAt, fiveMinAgo);

      // With force: should re-scrape and return new timestamp
      const fresh = await getTimetable(slug, true);
      assert.notStrictEqual(fresh.metadata.lastScrapedAt, fiveMinAgo);
      assert.ok(new Date(fresh.metadata.lastScrapedAt).getTime() > new Date(fiveMinAgo).getTime());
    }
  });
});
