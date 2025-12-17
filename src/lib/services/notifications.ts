/**
 * Notification Service
 * Handles queuing and processing of notifications
 */

import { NotificationType } from "@/lib/constants/notificationTypes";
import type {
  EventUpdatedPayload,
  NewEventPublishedPayload,
  NewParticipantJoinedPayload,
  EventCancelledPayload,
} from "@/lib/types/notification";
import {
  addToQueue,
  claimPendingNotifications,
  markAsSent,
  markAsFailed,
  resetStuckNotifications,
} from "@/lib/db/notificationQueueRepo";
import {
  getUsersForNewEventNotification,
  isNotificationEnabled,
} from "@/lib/db/notificationSettingsRepo";
import { sendTelegramMessage, isRetryableError } from "@/lib/services/telegram/bot";
import { formatNotification } from "@/lib/services/telegram/formatters";

// ============================================================================
// Queue New Event Notifications (City-based)
// ============================================================================

export interface QueueNewEventParams {
  eventId: string;
  eventTitle: string;
  cityId: string;
  cityName: string;
  categoryName: string;
  dateTime: string;
  locationText: string;
  creatorId: string;
}

/**
 * Queue notifications for new event to all users in the same city
 * Excludes event creator
 */
export async function queueNewEventNotifications(
  params: QueueNewEventParams
): Promise<{ queued: number; skipped: number }> {
  const {
    eventId,
    eventTitle,
    cityId,
    cityName,
    categoryName,
    dateTime,
    locationText,
    creatorId,
  } = params;

  try {
    // Get users in the same city who want new event notifications
    const users = await getUsersForNewEventNotification(cityId, creatorId);

    if (users.length === 0) {
      console.log(`[Notifications] No users to notify for new event ${eventId} in city ${cityId}`);
      return { queued: 0, skipped: 0 };
    }

    console.log(`[Notifications] Queuing new event notifications for ${users.length} users`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://need4trip.kz';
    const eventUrl = `${baseUrl}/events/${eventId}`;
    const settingsUrl = `${baseUrl}/profile/notifications`;

    const payload: NewEventPublishedPayload = {
      eventId,
      eventTitle,
      cityName,
      categoryName,
      dateTime,
      locationText,
      eventUrl,
      settingsUrl,
    };

    let queued = 0;
    let skipped = 0;

    for (const user of users) {
      const added = await addToQueue({
        eventId,
        userId: user.userId,
        triggerType: NotificationType.NEW_EVENT_PUBLISHED,
        telegramChatId: user.telegramChatId,
        payload,
      });

      if (added) {
        queued++;
      } else {
        skipped++; // Duplicate
      }
    }

    console.log(`[Notifications] New event: queued=${queued}, skipped=${skipped}`);
    return { queued, skipped };
  } catch (error) {
    console.error('[Notifications] Failed to queue new event notifications:', error);
    return { queued: 0, skipped: 0 };
  }
}

// ============================================================================
// Queue New Participant Notification (for organizer)
// ============================================================================

export interface QueueNewParticipantParams {
  eventId: string;
  eventTitle: string;
  organizerId: string;
  organizerTelegramId: string;
  participantName: string;
  registrationId: string;
  totalParticipants: number;
  maxParticipants: number | null;
}

/**
 * Queue notification to event organizer about new participant
 */
export async function queueNewParticipantNotification(
  params: QueueNewParticipantParams
): Promise<{ queued: boolean }> {
  const {
    eventId,
    eventTitle,
    organizerId,
    organizerTelegramId,
    participantName,
    registrationId,
    totalParticipants,
    maxParticipants,
  } = params;

  try {
    // Check if organizer wants this notification
    const enabled = await isNotificationEnabled(organizerId, 'notifyNewParticipantJoined');
    if (!enabled) {
      console.log(`[Notifications] Organizer ${organizerId} has new participant notifications disabled`);
      return { queued: false };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://need4trip.kz';
    const eventUrl = `${baseUrl}/events/${eventId}`;
    const settingsUrl = `${baseUrl}/profile/notifications`;

    const payload: NewParticipantJoinedPayload = {
      eventId,
      eventTitle,
      participantName,
      totalParticipants,
      maxParticipants,
      eventUrl,
      settingsUrl,
    };

    const added = await addToQueue({
      eventId,
      userId: organizerId,
      triggerType: NotificationType.NEW_PARTICIPANT_JOINED,
      telegramChatId: organizerTelegramId,
      payload,
      dedupeParams: { registrationId },
    });

    console.log(`[Notifications] New participant notification: queued=${added}`);
    return { queued: added };
  } catch (error) {
    console.error('[Notifications] Failed to queue new participant notification:', error);
    return { queued: false };
  }
}

// ============================================================================
// Queue Event Updated Notifications
// ============================================================================

export interface QueueEventUpdatedParams {
  eventId: string;
  eventTitle: string;
  eventVersion: number;
  changes: {
    dateTimeChanged: boolean;
    locationChanged: boolean;
    rulesChanged: boolean;
    maxParticipantsChanged: boolean;
    paymentChanged: boolean;
    vehicleRequirementChanged: boolean;
  };
  participantIds: string[];
}

/**
 * Queue event update notifications to all participants
 */
export async function queueEventUpdatedNotifications(
  params: QueueEventUpdatedParams
): Promise<{ queued: number; skipped: number }> {
  const { eventId, eventTitle, eventVersion, changes, participantIds } = params;

  // TODO: Implement with participant settings check
  console.log(`[Notifications] Queueing event updated notifications for ${participantIds.length} participants`);

  return { queued: 0, skipped: 0 };
}

// ============================================================================
// Process Notification Queue (Worker)
// ============================================================================

export interface ProcessQueueResult {
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Process pending notifications (called by cron)
 */
export async function processNotificationQueue(
  batchSize: number = 50,
  workerId: string = `worker-${Date.now()}`
): Promise<ProcessQueueResult> {
  const result: ProcessQueueResult = {
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    console.log(`[NotificationWorker] Starting batch processing (size=${batchSize}, worker=${workerId})`);

    // Claim notifications (parallel-safe)
    const notifications = await claimPendingNotifications(batchSize, workerId);

    if (notifications.length === 0) {
      console.log('[NotificationWorker] No pending notifications');
      return result;
    }

    console.log(`[NotificationWorker] Processing ${notifications.length} notifications`);

    // Process each notification
    for (const notification of notifications) {
      try {
        // Format message using registry
        const formatted = formatNotification(
          notification.triggerType,
          notification.payload
        );

        // Send via Telegram
        const { success, error } = await sendTelegramMessage(
          notification.telegramChatId,
          formatted.text,
          {
            parse_mode: formatted.parse_mode,
            reply_markup: formatted.reply_markup,
          }
        );

        if (success) {
          await markAsSent(notification.id);
          result.sent++;
          console.log(`[NotificationWorker] Sent notification ${notification.id}`);
        } else {
          // Check if error is retryable
          if (error && !isRetryableError(error)) {
            // Non-retryable error (user blocked bot, etc.)
            await markAsFailed(notification.id, error, 1); // Move to DLQ immediately
            result.skipped++;
            console.log(`[NotificationWorker] Skipped non-retryable notification ${notification.id}: ${error}`);
          } else {
            // Retryable error
            await markAsFailed(notification.id, error || 'Unknown error', notification.maxAttempts);
            result.failed++;
            console.log(`[NotificationWorker] Failed notification ${notification.id}: ${error}`);
          }
        }
      } catch (error) {
        console.error(`[NotificationWorker] Error processing notification ${notification.id}:`, error);
        await markAsFailed(
          notification.id,
          error instanceof Error ? error.message : 'Unknown error',
          notification.maxAttempts
        );
        result.failed++;
      }
    }

    console.log(`[NotificationWorker] Batch complete: sent=${result.sent}, failed=${result.failed}, skipped=${result.skipped}`);

    return result;
  } catch (error) {
    console.error('[NotificationWorker] Fatal error in processNotificationQueue:', error);
    return result;
  }
}

// ============================================================================
// Maintenance Functions
// ============================================================================

/**
 * Reset stuck notifications (recovery)
 * Should be called periodically (e.g., every 30 minutes)
 */
export async function resetStuckNotificationsTask(
  timeoutMinutes: number = 30
): Promise<{ reset: number }> {
  try {
    const count = await resetStuckNotifications(timeoutMinutes);
    if (count > 0) {
      console.log(`[NotificationMaintenance] Reset ${count} stuck notifications`);
    }
    return { reset: count };
  } catch (error) {
    console.error('[NotificationMaintenance] Failed to reset stuck notifications:', error);
    return { reset: 0 };
  }
}
