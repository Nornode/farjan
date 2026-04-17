import cron from 'node-cron';
import { runScraper } from './scraper.js';

export function startScheduler() {
  // Run daily at 01:07 AM Helsinki time (server runs in UTC; cron fires in
  // container local time which we set to Europe/Helsinki via TZ env var)
  cron.schedule('7 1 * * *', async () => {
    console.log('[scheduler] Daily timetable update triggered');
    try {
      await runScraper();
      console.log('[scheduler] Daily update complete');
    } catch (err) {
      console.error('[scheduler] Daily update failed:', err.message);
    }
  });

  console.log('[scheduler] Daily timetable update scheduled for 01:07 Helsinki time');
}
