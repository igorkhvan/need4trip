import { NextRequest } from 'next/server';
import { respondJSON, respondError } from '@/lib/api/response';
import { processNotificationQueue, resetStuckNotificationsTask } from '@/lib/services/notifications';
import { getQueueStats } from '@/lib/db/notificationQueueRepo';
import { AuthError } from '@/lib/errors';
import { log } from '@/lib/utils/logger';

/**
 * Cron job endpoint for processing notification queue
 * Protected by CRON_SECRET
 * 
 * Configured in vercel.json to run every 5 minutes
 */
export async function POST(request: NextRequest) {
  try {
    // NOTE: Cron secret verified by middleware
    // This route should only be reachable if middleware passed
    
    const startTime = Date.now();

    // Generate unique worker ID
    const workerId = `worker-${process.env.VERCEL_REGION || 'local'}-${Date.now()}`;

    // Process notifications
    const result = await processNotificationQueue(50, workerId);

    // Reset stuck notifications (every run)
    const resetResult = await resetStuckNotificationsTask(30);

    // Get queue stats
    const stats = await getQueueStats();

    const duration = Date.now() - startTime;

    log.info("Cron: Notification processing complete", {
      workerId,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      reset: resetResult.reset,
      duration,
    });

    return respondJSON({
      success: true,
      workerId,
      duration,
      processed: {
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
      },
      maintenance: {
        reset: resetResult.reset,
      },
      queueStats: stats,
    });
  } catch (error) {
    log.errorWithStack("Cron: Error processing notifications", error);
    return respondError(error);
  }
}

/**
 * Manual trigger endpoint (for testing)
 * Requires cron secret (verified by middleware)
 */
export async function GET(request: NextRequest) {
  try {
    // NOTE: Already verified by middleware
    // Get current stats only
    const stats = await getQueueStats();

    return respondJSON({
      queueStats: stats,
      message: 'Use POST to trigger processing',
    });
  } catch (error) {
    return respondError(error);
  }
}
