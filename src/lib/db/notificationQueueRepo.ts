/**
 * Notification Queue Repository
 * Hardened with deduplication, parallel-safe claiming, and DLQ
 */

import { supabaseAdmin, ensureAdminClient } from "@/lib/db/client";
import type { NotificationQueueItem, NotificationTrigger, NotificationPayload } from "@/lib/types/notification";
import { buildDedupeKey } from "@/lib/types/notification";

export interface AddToQueueParams {
  eventId: string;
  userId: string;
  triggerType: NotificationTrigger;
  telegramChatId: string;
  payload: NotificationPayload;
  scheduledFor?: Date;
  dedupeParams?: {
    version?: number;
    registrationId?: string;
  };
}

/**
 * Add notification to queue with automatic deduplication
 * Returns true if added, false if duplicate
 */
export async function addToQueue(params: AddToQueueParams): Promise<boolean> {
  const {
    eventId,
    userId,
    triggerType,
    telegramChatId,
    payload,
    scheduledFor = new Date(),
    dedupeParams = {},
  } = params;

  // Build dedupe key
  const dedupeKey = buildDedupeKey(triggerType, {
    eventId,
    userId,
    ...dedupeParams,
  });

  // Generate message (placeholder, will be formatted by sender)
  const message = JSON.stringify(payload); // Temporary, formatter will replace

  try {
    ensureAdminClient();
    
    // Cast payload to Json type for Supabase compatibility
    const jsonPayload = JSON.parse(JSON.stringify(payload));
    
    const { error } = await supabaseAdmin!
      .from('notification_queue')
      .insert({
        event_id: eventId,
        user_id: userId,
        trigger_type: triggerType,
        telegram_chat_id: telegramChatId,
        message,
        payload: jsonPayload,
        dedupe_key: dedupeKey,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
      });

    if (error) {
      // Check if it's a unique constraint violation (duplicate)
      if (error.code === '23505') {
        console.log(`[NotificationQueue] Duplicate notification ignored: ${dedupeKey}`);
        return false;
      }
      throw error;
    }

    console.log(`[NotificationQueue] Added notification: ${dedupeKey}`);
    return true;
  } catch (error) {
    console.error('[NotificationQueue] Failed to add notification:', error);
    throw error;
  }
}

/**
 * Claim pending notifications for processing (parallel-safe)
 * Uses FOR UPDATE SKIP LOCKED to avoid conflicts between workers
 */
export async function claimPendingNotifications(
  batchSize: number,
  workerId: string
): Promise<NotificationQueueItem[]> {
  try {
    ensureAdminClient();
    // Use the claim function from migration
    const { data, error } = await supabaseAdmin!.rpc('claim_pending_notifications', {
      p_batch_size: batchSize,
      p_worker_id: workerId,
    });

    if (error) {
      console.error('[NotificationQueue] Failed to claim notifications:', error);
      throw error;
    }

    return (data || []).map(mapDbToQueueItem);
  } catch (error) {
    console.error('[NotificationQueue] Error in claimPendingNotifications:', error);
    return [];
  }
}

/**
 * Mark notification as sent
 */
export async function markAsSent(id: string): Promise<void> {
  ensureAdminClient();
  const { error } = await supabaseAdmin!
    .from('notification_queue')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error(`[NotificationQueue] Failed to mark as sent: ${id}`, error);
    throw error;
  }
}

/**
 * Mark notification as failed and increment attempts
 * If max attempts reached, move to DLQ
 */
export async function markAsFailed(
  id: string,
  errorMessage: string,
  maxAttempts: number = 3
): Promise<void> {
  // Get current attempts
  ensureAdminClient();
  const { data: notification, error: fetchError } = await supabaseAdmin!
    .from('notification_queue')
    .select('attempts')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error(`[NotificationQueue] Failed to fetch notification: ${id}`, fetchError);
    throw fetchError;
  }

  const newAttempts = (notification?.attempts || 0) + 1;

  // If max attempts reached, move to DLQ
  if (newAttempts >= maxAttempts) {
    await moveToDLQ(id, errorMessage);
    return;
  }

  // Otherwise, reschedule with exponential backoff
  const backoffMinutes = Math.pow(2, newAttempts) * 5; // 5, 10, 20 minutes
  const scheduledFor = new Date(Date.now() + backoffMinutes * 60 * 1000);

  const { error } = await supabaseAdmin!
    .from('notification_queue')
    .update({
      status: 'pending',
      attempts: newAttempts,
      last_error: errorMessage,
      scheduled_for: scheduledFor.toISOString(),
      locked_at: null,
      locked_by: null,
    })
    .eq('id', id);

  if (error) {
    console.error(`[NotificationQueue] Failed to mark as failed: ${id}`, error);
    throw error;
  }

  console.log(`[NotificationQueue] Rescheduled notification ${id} for ${scheduledFor.toISOString()} (attempt ${newAttempts}/${maxAttempts})`);
}

/**
 * Move notification to dead letter queue
 */
export async function moveToDLQ(id: string, errorMessage: string): Promise<void> {
  try {
    ensureAdminClient();
    await supabaseAdmin!.rpc('move_to_dead_letter_queue', {
      p_notification_id: id,
      p_error_message: errorMessage,
    });

    console.log(`[NotificationQueue] Moved notification ${id} to DLQ`);
  } catch (error) {
    console.error(`[NotificationQueue] Failed to move to DLQ: ${id}`, error);
    throw error;
  }
}

/**
 * Reset stuck notifications (recovery function)
 * Should be run periodically (e.g., every 30 minutes)
 */
export async function resetStuckNotifications(timeoutMinutes: number = 30): Promise<number> {
  try {
    ensureAdminClient();
    const { data: count, error } = await supabaseAdmin!.rpc('reset_stuck_notifications', {
      p_timeout_minutes: timeoutMinutes,
    });

    if (error) {
      console.error('[NotificationQueue] Failed to reset stuck notifications:', error);
      throw error;
    }

    if (count && count > 0) {
      console.log(`[NotificationQueue] Reset ${count} stuck notifications`);
    }

    return count || 0;
  } catch (error) {
    console.error('[NotificationQueue] Error in resetStuckNotifications:', error);
    return 0;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}> {
  ensureAdminClient();
  const { data, error } = await supabaseAdmin!
    .from('notification_queue')
    .select('status')
    .in('status', ['pending', 'processing', 'sent', 'failed']);

  if (error) {
    console.error('[NotificationQueue] Failed to get stats:', error);
    return { pending: 0, processing: 0, sent: 0, failed: 0 };
  }

  const stats = {
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
  };

  for (const row of data || []) {
    stats[row.status as keyof typeof stats]++;
  }

  return stats;
}

/**
 * Map database row to NotificationQueueItem
 */
function mapDbToQueueItem(row: any): NotificationQueueItem {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    triggerType: row.trigger_type,
    message: row.message,
    telegramChatId: row.telegram_chat_id,
    status: row.status,
    attempts: row.attempts || 0,
    maxAttempts: row.max_attempts || 3,
    lastError: row.last_error,
    createdAt: row.created_at,
    sentAt: row.sent_at,
    scheduledFor: row.scheduled_for,
    dedupeKey: row.dedupe_key,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    payload: row.payload,
    movedToDlqAt: row.moved_to_dlq_at,
  };
}
