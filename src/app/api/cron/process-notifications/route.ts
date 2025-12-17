import { NextRequest } from 'next/server';
import { respondJSON, respondError } from '@/lib/api/response';
import { processNotificationQueue, resetStuckNotificationsTask } from '@/lib/services/notifications';
import { getQueueStats } from '@/lib/db/notificationQueueRepo';
import { AuthError } from '@/lib/errors';

/**
 * Cron job endpoint for processing notification queue
 * Protected by CRON_SECRET
 * 
 * Vercel Cron configuration:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-notifications",
 *     "schedule": "*/5 * * * *"
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      throw new AuthError('Unauthorized', undefined, 401);
    }

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

    console.log(
      `[Cron] Notification processing complete: ` +
      `sent=${result.sent}, failed=${result.failed}, skipped=${result.skipped}, ` +
      `reset=${resetResult.reset}, duration=${duration}ms`
    );

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
    console.error('[Cron] Error processing notifications:', error);
    return respondError(error);
  }
}

/**
 * Manual trigger endpoint (for testing)
 * Requires admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // For testing, allow with admin auth or cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      throw new AuthError('Unauthorized - use POST with CRON_SECRET', undefined, 401);
    }

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
