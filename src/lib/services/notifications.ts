/**
 * Notification Service
 * Handles queuing and processing of notifications
 * 
 * @see docs/adr/ADR-001.3.md - SystemContext for cron operations
 */

import { NotificationType } from "@/lib/constants/notificationTypes";
import type { SystemContext } from "@/lib/auth/systemContext";
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

  try {
    if (participantIds.length === 0) {
      console.log(`[Notifications] No participants to notify for event ${eventId}`);
      return { queued: 0, skipped: 0 };
    }

    // Get participants with user info and notification settings
    type ParticipantWithSettings = {
      id: string;
      user_id: string | null;
      display_name: string;
      users: {
        id: string;
        telegram_id: string | null;
        user_notification_settings: {
          is_telegram_enabled: boolean;
          notify_event_updated: boolean;
        };
      };
    };

    const { supabaseAdmin } = await import("@/lib/db/client");
    const { data: participants, error } = await supabaseAdmin!
      .from('event_participants')
      .select(`
        id,
        user_id,
        display_name,
        users!inner(
          id,
          telegram_id,
          user_notification_settings!inner(
            is_telegram_enabled,
            notify_event_updated
          )
        )
      `)
      .eq('event_id', eventId)
      .not('user_id', 'is', null) as { data: ParticipantWithSettings[] | null; error: any };

    if (error) {
      console.error('[Notifications] Failed to fetch participants with settings:', error);
      return { queued: 0, skipped: 0 };
    }

    if (!participants || participants.length === 0) {
      console.log(`[Notifications] No authenticated participants found for event ${eventId}`);
      return { queued: 0, skipped: 0 };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://need4trip.kz';
    const eventUrl = `${baseUrl}/events/${eventId}`;
    const settingsUrl = `${baseUrl}/profile/notifications`;

    const payload: EventUpdatedPayload = {
      eventId,
      eventTitle,
      eventVersion,
      changes,
      eventUrl,
      settingsUrl,
    };

    let queued = 0;
    let skipped = 0;

    for (const participant of participants) {
      const user = participant.users;
      const settings = user.user_notification_settings;

      // Check if user has notifications enabled
      if (!settings?.is_telegram_enabled || !settings?.notify_event_updated) {
        skipped++;
        continue;
      }

      if (!user?.telegram_id) {
        skipped++;
        continue;
      }

      const added = await addToQueue({
        eventId,
        userId: user.id,
        triggerType: NotificationType.EVENT_UPDATED,
        telegramChatId: user.telegram_id,
        payload,
        dedupeParams: { version: eventVersion },
      });

      if (added) {
        queued++;
      } else {
        skipped++;
      }
    }

    console.log(`[Notifications] Event updated: queued=${queued}, skipped=${skipped}`);
    return { queued, skipped };
  } catch (error) {
    console.error('[Notifications] Failed to queue event updated notifications:', error);
    return { queued: 0, skipped: 0 };
  }
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
 * 
 * @param ctx - SystemContext from cron route (ADR-001.3 §3.4)
 * @param batchSize - Number of notifications to process per batch
 * @param workerId - Unique worker identifier
 */
export async function processNotificationQueue(
  ctx: SystemContext,
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
 * 
 * @param ctx - SystemContext from cron route (ADR-001.3 §3.4)
 * @param timeoutMinutes - Minutes after which processing notifications are considered stuck
 */
export async function resetStuckNotificationsTask(
  ctx: SystemContext,
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
