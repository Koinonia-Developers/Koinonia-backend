import cron from 'node-cron';
import { libraryLinkValidationJob } from './library.job';

/**
 * Initialize library jobs
 * This sets up the weekly link validation job to run every Sunday at 2:00 AM
 */
export function initializeLibraryJobs() {
    try {
        // Schedule: Run every Sunday at 2:00 AM
        // Format: "0 2 * * 0" (minute, hour, day of month, month, day of week)
        const job = cron.schedule('0 2 * * 0', async () => {
            console.log('[Library Jobs] Running scheduled link validation job...');
            await libraryLinkValidationJob.runWeeklyLinkValidation();
        });

        job.start();
        console.log('[Library Jobs] Library jobs initialized. Link validation scheduled for Sundays at 2:00 AM');

        return job;
    } catch (error) {
        console.error('[Library Jobs] Error initializing library jobs:', error);
        throw error;
    }
}

export { libraryLinkValidationJob };
