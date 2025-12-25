/**
 * Notification Settings Repository
 * Manages user preferences for notifications
 */

import { getAdminDb } from "@/lib/db/client";
import type { NotificationSettings, NotificationSettingsUpdate } from "@/lib/types/notification";
import { NotificationTypeDefaults } from "@/lib/constants/notificationTypes";

/**
 * Get user notification settings
 * Creates default settings if not exists
 */
export async function getUserNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  try {
    const db = getAdminDb();
    const { data, error } = await db!
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found, create default settings
        return await createDefaultSettings(userId);
      }
      console.error('[NotificationSettings] Failed to get settings:', error);
      throw error;
    }

    return mapDbToSettings(data);
  } catch (error) {
    console.error('[NotificationSettings] Error in getUserNotificationSettings:', error);
    return null;
  }
}

/**
 * Create default notification settings for a user
 */
export async function createDefaultSettings(userId: string): Promise<NotificationSettings> {
  const db = getAdminDb();
  
  const defaults = {
    user_id: userId,
    is_telegram_enabled: true,
    notify_event_updated: NotificationTypeDefaults.event_updated,
    notify_new_event_published: NotificationTypeDefaults.new_event_published,
    notify_event_cancelled: NotificationTypeDefaults.event_cancelled,
    notify_new_participant_joined: NotificationTypeDefaults.new_participant_joined,
    notify_event_reminder: NotificationTypeDefaults.event_reminder,
    notify_organizer_message: NotificationTypeDefaults.organizer_message,
  };

  const { data, error } = await db
    .from('user_notification_settings')
    .insert(defaults)
    .select()
    .single();

  if (error) {
    console.error('[NotificationSettings] Failed to create default settings:', error);
    throw error;
  }

  return mapDbToSettings(data);
}

/**
 * Update notification settings
 */
export async function updateUserNotificationSettings(
  userId: string,
  updates: NotificationSettingsUpdate
): Promise<NotificationSettings> {
  const db = getAdminDb();
  
  const dbUpdates: Record<string, any> = {};

  if (updates.isTelegramEnabled !== undefined) {
    dbUpdates.is_telegram_enabled = updates.isTelegramEnabled;
  }
  if (updates.notifyEventUpdated !== undefined) {
    dbUpdates.notify_event_updated = updates.notifyEventUpdated;
  }
  if (updates.notifyNewEventPublished !== undefined) {
    dbUpdates.notify_new_event_published = updates.notifyNewEventPublished;
  }
  if (updates.notifyEventCancelled !== undefined) {
    dbUpdates.notify_event_cancelled = updates.notifyEventCancelled;
  }
  if (updates.notifyNewParticipantJoined !== undefined) {
    dbUpdates.notify_new_participant_joined = updates.notifyNewParticipantJoined;
  }
  if (updates.notifyEventReminder !== undefined) {
    dbUpdates.notify_event_reminder = updates.notifyEventReminder;
  }
  if (updates.notifyOrganizerMessage !== undefined) {
    dbUpdates.notify_organizer_message = updates.notifyOrganizerMessage;
  }

  const { data, error } = await db
    .from('user_notification_settings')
    .update(dbUpdates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('[NotificationSettings] Failed to update settings:', error);
    throw error;
  }

  return mapDbToSettings(data);
}

/**
 * Get users in city who want new event notifications
 * Excludes event creator
 */
export async function getUsersForNewEventNotification(
  cityId: string,
  creatorId: string
): Promise<Array<{ userId: string; telegramChatId: string }>> {
  try {
    const db = getAdminDb();
    const { data, error } = await db!
      .from('users')
      .select(`
        id,
        telegram_id,
        user_notification_settings!inner(
          is_telegram_enabled,
          notify_new_event_published
        )
      `)
      .eq('city_id', cityId)
      .neq('id', creatorId)
      .not('telegram_id', 'is', null);

    if (error) {
      console.error('[NotificationSettings] Failed to get users for new event:', error);
      throw error;
    }

    // Filter by settings
    const filtered = (data || [])
      .filter((user: any) => {
        const settings = user.user_notification_settings;
        return (
          settings &&
          settings.is_telegram_enabled &&
          settings.notify_new_event_published
        );
      })
      .map((user: any) => ({
        userId: user.id,
        telegramChatId: user.telegram_id,
      }));

    return filtered;
  } catch (error) {
    console.error('[NotificationSettings] Error in getUsersForNewEventNotification:', error);
    return [];
  }
}

/**
 * Check if user wants specific notification type
 */
export async function isNotificationEnabled(
  userId: string,
  notificationType: keyof Omit<NotificationSettings, 'userId' | 'createdAt' | 'updatedAt'>
): Promise<boolean> {
  try {
    const settings = await getUserNotificationSettings(userId);
    if (!settings || !settings.isTelegramEnabled) {
      return false;
    }

    return settings[notificationType] === true;
  } catch (error) {
    console.error('[NotificationSettings] Error in isNotificationEnabled:', error);
    return false;
  }
}

/**
 * Map database row to NotificationSettings
 */
function mapDbToSettings(row: any): NotificationSettings {
  return {
    userId: row.user_id,
    isTelegramEnabled: row.is_telegram_enabled ?? true,
    notifyEventUpdated: row.notify_event_updated ?? true,
    notifyNewEventPublished: row.notify_new_event_published ?? false,
    notifyEventCancelled: row.notify_event_cancelled ?? true,
    notifyNewParticipantJoined: row.notify_new_participant_joined ?? true,
    notifyEventReminder: row.notify_event_reminder ?? true,
    notifyOrganizerMessage: row.notify_organizer_message ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
