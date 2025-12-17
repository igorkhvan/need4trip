/**
 * Canonical notification types - single source of truth
 * Used across DB, TypeScript, UI, and formatters
 */

export const NotificationType = {
  // Event lifecycle
  EVENT_UPDATED: 'event_updated',
  NEW_EVENT_PUBLISHED: 'new_event_published',
  EVENT_CANCELLED: 'event_cancelled',
  
  // Participation
  NEW_PARTICIPANT_JOINED: 'new_participant_joined',
  
  // Future notifications
  EVENT_REMINDER: 'event_reminder',
  ORGANIZER_MESSAGE: 'organizer_message',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/**
 * Human-readable labels for UI
 */
export const NotificationTypeLabel: Record<NotificationType, string> = {
  [NotificationType.EVENT_UPDATED]: 'Изменение события',
  [NotificationType.NEW_EVENT_PUBLISHED]: 'Новое событие в городе',
  [NotificationType.EVENT_CANCELLED]: 'Отмена события',
  [NotificationType.NEW_PARTICIPANT_JOINED]: 'Новый участник',
  [NotificationType.EVENT_REMINDER]: 'Напоминание о событии',
  [NotificationType.ORGANIZER_MESSAGE]: 'Сообщение от организатора',
};

/**
 * Human-readable descriptions for settings page
 */
export const NotificationTypeDescription: Record<NotificationType, string> = {
  [NotificationType.EVENT_UPDATED]: 'Уведомления при изменении даты, места, правил события',
  [NotificationType.NEW_EVENT_PUBLISHED]: 'Уведомления о новых событиях в вашем городе',
  [NotificationType.EVENT_CANCELLED]: 'Уведомления об отмене события',
  [NotificationType.NEW_PARTICIPANT_JOINED]: 'Уведомления когда кто-то регистрируется на ваше событие',
  [NotificationType.EVENT_REMINDER]: 'Напоминания о предстоящих событиях',
  [NotificationType.ORGANIZER_MESSAGE]: 'Сообщения от организатора события',
};

/**
 * Default enabled state for each notification type
 */
export const NotificationTypeDefaults: Record<NotificationType, boolean> = {
  [NotificationType.EVENT_UPDATED]: true,
  [NotificationType.NEW_EVENT_PUBLISHED]: false, // Opt-in for city notifications
  [NotificationType.EVENT_CANCELLED]: true,
  [NotificationType.NEW_PARTICIPANT_JOINED]: true,
  [NotificationType.EVENT_REMINDER]: true,
  [NotificationType.ORGANIZER_MESSAGE]: true,
};

/**
 * Map notification type to settings column name
 */
export function getSettingsColumnName(type: NotificationType): string {
  // Convert 'event_updated' -> 'notify_event_updated'
  return `notify_${type}`;
}

/**
 * Validate notification type
 */
export function isValidNotificationType(type: string): type is NotificationType {
  return Object.values(NotificationType).includes(type as NotificationType);
}
