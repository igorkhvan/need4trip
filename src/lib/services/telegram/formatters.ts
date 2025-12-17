/**
 * Telegram Message Formatters Registry
 * Extensible system for formatting notifications
 */

import { NotificationType } from "@/lib/constants/notificationTypes";
import type {
  NotificationTrigger,
  EventUpdatedPayload,
  NewEventPublishedPayload,
  NewParticipantJoinedPayload,
  EventCancelledPayload,
  EventReminderPayload,
  OrganizerMessagePayload,
} from "@/lib/types/notification";
import type { InlineKeyboardMarkup } from "@/lib/services/telegram/bot";

// ============================================================================
// Telegram Message Structure
// ============================================================================

export interface TelegramMessage {
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?: InlineKeyboardMarkup;
}

// ============================================================================
// Formatter Type
// ============================================================================

type Formatter<T = any> = (payload: T) => TelegramMessage;

// ============================================================================
// Individual Formatters
// ============================================================================

/**
 * Format EVENT_UPDATED notification
 */
export const formatEventUpdated: Formatter<EventUpdatedPayload> = (payload) => {
  const { eventTitle, changes, eventUrl, settingsUrl } = payload;

  let changesText = '';
  if (changes.dateTimeChanged) changesText += '⏰ Изменилась дата или время\n';
  if (changes.locationChanged) changesText += '📍 Изменилось место сбора\n';
  if (changes.rulesChanged) changesText += '📋 Обновлены правила\n';
  if (changes.maxParticipantsChanged) changesText += '👥 Изменился лимит участников\n';
  if (changes.paymentChanged) changesText += '💰 Изменились условия оплаты\n';
  if (changes.vehicleRequirementChanged) changesText += '🚗 Изменились требования к транспорту\n';

  const text = `🔔 <b>Изменение в событии</b>\n\n📌 ${eventTitle}\n\n${changesText}`;

  return {
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👉 Открыть событие', url: eventUrl },
          { text: '⚙️ Настройки', url: settingsUrl },
        ],
      ],
    },
  };
};

/**
 * Format NEW_EVENT_PUBLISHED notification
 */
export const formatNewEventPublished: Formatter<NewEventPublishedPayload> = (payload) => {
  const { eventTitle, cityName, categoryName, dateTime, locationText, eventUrl, settingsUrl } = payload;

  const date = new Date(dateTime);
  const formattedDate = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const text = 
    `🎉 <b>Новое событие в вашем городе</b>\n\n` +
    `📌 ${eventTitle}\n\n` +
    `📂 Категория: ${categoryName}\n` +
    `📅 Дата: ${formattedDate}\n` +
    `📍 Место: ${locationText}, ${cityName}`;

  return {
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👉 Открыть событие', url: eventUrl },
          { text: '⚙️ Настройки', url: settingsUrl },
        ],
      ],
    },
  };
};

/**
 * Format NEW_PARTICIPANT_JOINED notification
 */
export const formatNewParticipantJoined: Formatter<NewParticipantJoinedPayload> = (payload) => {
  const { eventTitle, participantName, totalParticipants, maxParticipants, eventUrl, settingsUrl } = payload;

  const countText = maxParticipants 
    ? `Участников: ${totalParticipants}/${maxParticipants}`
    : `Участников: ${totalParticipants}`;

  const text = 
    `👥 <b>Новый участник</b>\n\n` +
    `📌 ${eventTitle}\n\n` +
    `✅ ${participantName} зарегистрировался на событие\n` +
    `${countText}`;

  return {
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👉 Открыть событие', url: eventUrl },
          { text: '⚙️ Настройки', url: settingsUrl },
        ],
      ],
    },
  };
};

/**
 * Format EVENT_CANCELLED notification
 */
export const formatEventCancelled: Formatter<EventCancelledPayload> = (payload) => {
  const { eventTitle, eventUrl, settingsUrl } = payload;

  const text = 
    `🔔 <b>Отмена события</b>\n\n` +
    `📌 ${eventTitle}\n\n` +
    `❌ Событие отменено организатором`;

  return {
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👉 Открыть событие', url: eventUrl },
          { text: '⚙️ Настройки', url: settingsUrl },
        ],
      ],
    },
  };
};

/**
 * Format EVENT_REMINDER notification
 */
export const formatEventReminder: Formatter<EventReminderPayload> = (payload) => {
  const { eventTitle, dateTime, locationText, eventUrl, settingsUrl } = payload;

  const date = new Date(dateTime);
  const formattedDate = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const text = 
    `⏰ <b>Напоминание о событии</b>\n\n` +
    `📌 ${eventTitle}\n\n` +
    `📅 ${formattedDate}\n` +
    `📍 ${locationText}`;

  return {
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👉 Открыть событие', url: eventUrl },
          { text: '⚙️ Настройки', url: settingsUrl },
        ],
      ],
    },
  };
};

/**
 * Format ORGANIZER_MESSAGE notification
 */
export const formatOrganizerMessage: Formatter<OrganizerMessagePayload> = (payload) => {
  const { eventTitle, message, organizerName, eventUrl, settingsUrl } = payload;

  const text = 
    `💬 <b>Сообщение от организатора</b>\n\n` +
    `📌 ${eventTitle}\n` +
    `👤 ${organizerName}\n\n` +
    `${message}`;

  return {
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '👉 Открыть событие', url: eventUrl },
          { text: '⚙️ Настройки', url: settingsUrl },
        ],
      ],
    },
  };
};

// ============================================================================
// Formatter Registry (Extensibility Core)
// ============================================================================

/**
 * Centralized registry of formatters
 * Adding a new notification type = 1 line here
 */
export const formatters: Record<NotificationTrigger, Formatter> = {
  [NotificationType.EVENT_UPDATED]: formatEventUpdated,
  [NotificationType.NEW_EVENT_PUBLISHED]: formatNewEventPublished,
  [NotificationType.NEW_PARTICIPANT_JOINED]: formatNewParticipantJoined,
  [NotificationType.EVENT_CANCELLED]: formatEventCancelled,
  [NotificationType.EVENT_REMINDER]: formatEventReminder,
  [NotificationType.ORGANIZER_MESSAGE]: formatOrganizerMessage,
};

/**
 * Get formatter for notification type
 */
export function getFormatter(type: NotificationTrigger): Formatter {
  const formatter = formatters[type];
  if (!formatter) {
    throw new Error(`No formatter found for notification type: ${type}`);
  }
  return formatter;
}

/**
 * Format notification using registry
 */
export function formatNotification(type: NotificationTrigger, payload: any): TelegramMessage {
  const formatter = getFormatter(type);
  return formatter(payload);
}
