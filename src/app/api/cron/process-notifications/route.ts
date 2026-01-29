/**
 * Cron job endpoint for processing notification queue
 * 
 * Implements ADR-001.3 (System Context):
 * - Uses canonical resolveSystemContext() for authentication
 * - Passes SystemContext explicitly to service layer
 * - Minimal audit logging per §6
 * 
 * Protected by CRON_SECRET or Vercel cron header
 * Configured in vercel.json to run every 5 minutes
 * 
 * @see docs/adr/ADR-001.3.md
 * @see SSOT_ARCHITECTURE.md §8.3
 */

import { NextRequest } from 'next/server';
import { respondJSON, respondError } from '@/lib/api/response';
import { processNotificationQueue, resetStuckNotificationsTask } from '@/lib/services/notifications';
import { getQueueStats } from '@/lib/db/notificationQueueRepo';
import { resolveSystemContext } from '@/lib/auth/resolveSystemContext';
import type { SystemContext } from '@/lib/auth/systemContext';
import { log } from '@/lib/utils/logger';

/**
 * Minimal audit logging for system actions (ADR-001.3 §6)
 * 
 * MUST LOG: action/jobName, timestamp, route/path, result
 * MUST NOT LOG: secrets, Authorization header, PII
 */
function auditSystemAction(
  ctx: SystemContext,
  path: string,
  result: 'success' | 'failure',
  details?: Record<string, unknown>
): void {
  log.info('System action executed', {
    action: ctx.jobName,
    timestamp: new Date().toISOString(),
    path,
    trigger: ctx.trigger,
    verifiedBy: ctx.verifiedBy,
    result,
    ...details,
  });
}

/**
 * POST /api/cron/process-notifications
 * 
 * Main cron job endpoint - processes notification queue
 */
export async function POST(request: NextRequest) {
  const path = '/api/cron/process-notifications';
  
  // Explicit SystemContext resolution (ADR-001.3 §3.3)
  // This is the ONLY auth check - no middleware reliance
  let ctx: SystemContext;
  try {
    ctx = resolveSystemContext(request, 'process-notifications');
  } catch (error) {
    // Auth failed - return 403 without logging secrets
    return respondError(error);
  }

  try {
    const startTime = Date.now();

    // Generate unique worker ID
    const workerId = `worker-${process.env.VERCEL_REGION || 'local'}-${Date.now()}`;

    // Process notifications with explicit SystemContext (ADR-001.3 §3.4)
    const result = await processNotificationQueue(ctx, 50, workerId);

    // Reset stuck notifications with explicit SystemContext
    const resetResult = await resetStuckNotificationsTask(ctx, 30);

    // Get queue stats
    const stats = await getQueueStats();

    const duration = Date.now() - startTime;

    // Audit successful execution (ADR-001.3 §6.1)
    auditSystemAction(ctx, path, 'success', {
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
    // Audit failed execution
    auditSystemAction(ctx, path, 'failure', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    log.errorWithStack('Cron: Error processing notifications', error);
    return respondError(error);
  }
}

/**
 * GET /api/cron/process-notifications
 * 
 * Manual trigger endpoint (for testing) - returns queue stats
 */
export async function GET(request: NextRequest) {
  const path = '/api/cron/process-notifications';
  
  // Explicit SystemContext resolution (ADR-001.3 §3.3)
  let ctx: SystemContext;
  try {
    ctx = resolveSystemContext(request, 'process-notifications-stats');
  } catch (error) {
    return respondError(error);
  }

  try {
    // Get current stats only
    const stats = await getQueueStats();

    // Audit successful execution
    auditSystemAction(ctx, path, 'success');

    return respondJSON({
      queueStats: stats,
      message: 'Use POST to trigger processing',
    });
  } catch (error) {
    auditSystemAction(ctx, path, 'failure', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return respondError(error);
  }
}
