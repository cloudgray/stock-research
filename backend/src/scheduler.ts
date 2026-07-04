import cron from 'node-cron';
import { startGeneration } from './reportService.js';
import type { ReportType } from './types.js';

const TIMEZONE = 'Asia/Seoul';

function trigger(type: ReportType): void {
  const started = startGeneration(type);
  if (started) {
    console.log(`[scheduler] started ${type} report generation`);
  } else {
    console.warn(`[scheduler] skipped ${type} generation — another job is running`);
  }
}

export function startScheduler(): void {
  // daily: 06:00 KST every day
  cron.schedule('0 6 * * *', () => trigger('daily'), { timezone: TIMEZONE });

  // weekly: 07:00 KST every Sunday
  cron.schedule('0 7 * * 0', () => trigger('weekly'), { timezone: TIMEZONE });

  // monthly: 08:00 KST on the 1st of every month
  cron.schedule('0 8 1 * *', () => trigger('monthly'), { timezone: TIMEZONE });

  console.log('[scheduler] cron jobs registered (daily 06:00, weekly Sun 07:00, monthly 1st 08:00, KST)');
}
