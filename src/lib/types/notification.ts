import { z } from "zod";
import { NotificationType } from "@/lib/constants/notificationTypes";

// ============================================================================
// Notification Types (aligned with DB enum and canonical constants)
// ============================================================================

export const notificationTriggerSchema = z.enum([
  NotificationType.EVENT_UPDATED,
  NotificationType.NEW_EVENT_PUBLISHED,
  NotificationType.EVENT_CANCELLED,
  NotificationType.NEW_PARTICIPANT_JOINED,
  NotificationType.EVENT_REMINDER,
  NotificationType.ORGANIZER_MESSAGE,
] as const);

export type NotificationTrigger = z.infer<typeof notificationTriggerSchema>;

// ============================================================================
// Notification Status
// ============================================================================

export const notificationStatusSchema = z.enum([
  'pending',
  'processing', // New: for parallel-safe workers
  'sent',
  'failed',
  'cancelled',
]);

export type NotificationStatus = z.infer<typeof notificationStatusSchema>;

// ============================================================================
// User Notification Settings
// ============================================================================

export interface NotificationSettings {
  userId: string;
  // Telegram enabled flag
  isTelegramEnabled: boolean;
  // Notification type preferences (1 column = 1 type)
  notifyEventUpdated: boolean;
  notifyNewEventPublished: boolean;
  notifyEventCancelled: boolean;
  notifyNewParticipantJoined: boolean;
  notifyEventReminder: boolean;
  notifyOrganizerMessage: boolean;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export const notificationSettingsUpdateSchema = z.object({
  isTelegramEnabled: z.boolean().optional(),
  notifyEventUpdated: z.boolean().optional(),
  notifyNewEventPublished: z.boolean().optional(),
  notifyEventCancelled: z.boolean().optional(),
  notifyNewParticipantJoined: z.boolean().optional(),
  notifyEventReminder: z.boolean().optional(),
  notifyOrganizerMessage: z.boolean().optional(),
});

export type NotificationSettingsUpdate = z.infer<typeof notificationSettingsUpdateSchema>;

// ============================================================================
// Notification Queue
// ============================================================================

export interface NotificationQueueItem {
  id: string;
  eventId: string;
  userId: string;
  triggerType: NotificationTrigger;
  message: string;
  telegramChatId: string;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
  scheduledFor: string;
  // Hardening fields
  dedupeKey: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
  payload: Record<string, any> | null;
  movedToDlqAt: string | null;
}

// ============================================================================
// Event Changes (for event_updated notifications)
// ============================================================================

export interface EventChanges {
  dateTimeChanged: boolean;
  locationChanged: boolean;
  rulesChanged: boolean;
  maxParticipantsChanged: boolean;
  paymentChanged: boolean;
  vehicleRequirementChanged: boolean;
}

// ============================================================================
// Notification Payloads (structured data for formatters)
// ============================================================================

export interface EventUpdatedPayload {
  eventId: string;
  eventTitle: string;
  eventVersion: number;
  changes: EventChanges;
  eventUrl: string;
  settingsUrl: string;
}

export interface NewEventPublishedPayload {
  eventId: string;
  eventTitle: string;
  cityName: string;
  categoryName: string;
  dateTime: string;
  locationText: string;
  eventUrl: string;
  settingsUrl: string;
}

export interface NewParticipantJoinedPayload {
  eventId: string;
  eventTitle: string;
  participantName: string;
  totalParticipants: number;
  maxParticipants: number | null;
  eventUrl: string;
  settingsUrl: string;
}

export interface EventCancelledPayload {
  eventId: string;
  eventTitle: string;
  eventUrl: string;
  settingsUrl: string;
}

export interface EventReminderPayload {
  eventId: string;
  eventTitle: string;
  dateTime: string;
  locationText: string;
  eventUrl: string;
  settingsUrl: string;
}

export interface OrganizerMessagePayload {
  eventId: string;
  eventTitle: string;
  message: string;
  organizerName: string;
  eventUrl: string;
  settingsUrl: string;
}

export type NotificationPayload = 
  | EventUpdatedPayload 
  | NewEventPublishedPayload 
  | NewParticipantJoinedPayload 
  | EventCancelledPayload
  | EventReminderPayload
  | OrganizerMessagePayload;

// ============================================================================
// Dedupe Key Builders
// ============================================================================

export function buildDedupeKey(
  type: NotificationTrigger,
  params: {
    eventId: string;
    userId: string;
    version?: number;
    registrationId?: string;
  }
): string {
  switch (type) {
    case NotificationType.EVENT_UPDATED:
      // Event updated: eventId:version:userId
      return `${type}:${params.eventId}:${params.version}:${params.userId}`;
    
    case NotificationType.NEW_EVENT_PUBLISHED:
      // New event: eventId:userId
      return `${type}:${params.eventId}:${params.userId}`;
    
    case NotificationType.NEW_PARTICIPANT_JOINED:
      // New participant: eventId:registrationId:organizerId
      return `${type}:${params.eventId}:${params.registrationId}:${params.userId}`;
    
    case NotificationType.EVENT_CANCELLED:
      // Event cancelled: eventId:userId
      return `${type}:${params.eventId}:${params.userId}`;
    
    case NotificationType.EVENT_REMINDER:
      // Event reminder: eventId:userId (one reminder per user per event)
      return `${type}:${params.eventId}:${params.userId}`;
    
    case NotificationType.ORGANIZER_MESSAGE:
      // Organizer message: eventId:userId:timestamp (allow multiple messages)
      const timestamp = new Date().getTime();
      return `${type}:${params.eventId}:${params.userId}:${timestamp}`;
    
    default:
      // Fallback: type:eventId:userId
      return `${type}:${params.eventId}:${params.userId}`;
  }
}
