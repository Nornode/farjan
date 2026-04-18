import cron from 'node-cron';
import { runScraper } from './scraper.js';
import { buildRegistry } from './ferryRegistry.js';

export function startScheduler() {
  // Daily Skåldö timetable refresh at 01:07 AM Helsinki time
  cron.schedule('7 1 * * *', async () => {
    console.log('[scheduler] Daily timetable update triggered');
    try {
      await runScraper();
      console.log('[scheduler] Daily update complete');
    } catch (err) {
      console.error('[scheduler] Daily update failed:', err.message);
    }
  });

  // Weekly ferry registry rebuild at 01:15 AM Helsinki time on Mondays
  cron.schedule('15 1 * * 1', async () => {
    console.log('[scheduler] Weekly registry rebuild triggered');
    try {
      await buildRegistry();
      console.log('[scheduler] Weekly registry rebuild complete');
    } catch (err) {
      console.error('[scheduler] Weekly registry rebuild failed:', err.message);
    }
  });

  console.log('[scheduler] Daily timetable update at 01:07, weekly registry rebuild at Mon 01:15 (Helsinki time)');
}
