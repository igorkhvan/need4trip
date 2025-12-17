/**
 * Telegram Bot Service
 * Handles sending messages via Telegram Bot API
 */

// ============================================================================
// Types
// ============================================================================

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface SendMessageOptions {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  reply_markup?: InlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
}

export interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Send message via Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options: SendMessageOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    const error = 'TELEGRAM_BOT_TOKEN is not configured';
    console.error('[TelegramBot]', error);
    return { success: false, error };
  }

  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || 'HTML',
      disable_web_page_preview: options.disable_web_page_preview ?? true,
      disable_notification: options.disable_notification ?? false,
      reply_markup: options.reply_markup,
    };

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      const error = data.description || 'Unknown Telegram API error';
      console.error('[TelegramBot] API error:', {
        error_code: data.error_code,
        description: data.description,
      });

      // Check for specific error codes
      if (data.error_code === 403) {
        // User blocked the bot or chat not found
        return { success: false, error: 'User blocked bot or chat not found' };
      }

      if (data.error_code === 429) {
        // Rate limit exceeded
        return { success: false, error: 'Rate limit exceeded' };
      }

      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    console.error('[TelegramBot] Network error:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Build inline keyboard with buttons
 */
export function buildInlineKeyboard(buttons: InlineKeyboardButton[][]): InlineKeyboardMarkup {
  return {
    inline_keyboard: buttons,
  };
}

/**
 * Create standard notification keyboard (Open Event + Settings)
 */
export function buildNotificationKeyboard(
  eventUrl: string,
  settingsUrl: string
): InlineKeyboardMarkup {
  return buildInlineKeyboard([
    [
      { text: '👉 Открыть событие', url: eventUrl },
      { text: '⚙️ Настройки', url: settingsUrl },
    ],
  ]);
}

/**
 * Test bot connection
 */
export async function testBotConnection(): Promise<{ success: boolean; botInfo?: any; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
      { method: 'GET' }
    );

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      return { success: false, error: data.description || 'Failed to get bot info' };
    }

    return { success: true, botInfo: data.result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get chat info
 */
export async function getChatInfo(chatId: string): Promise<{ success: boolean; chat?: any; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat?chat_id=${chatId}`,
      { method: 'GET' }
    );

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      return { success: false, error: data.description || 'Failed to get chat info' };
    }

    return { success: true, chat: data.result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================================================
// Error Handling Helpers
// ============================================================================

/**
 * Check if error is retryable
 */
export function isRetryableError(error: string): boolean {
  const nonRetryableErrors = [
    'User blocked bot',
    'chat not found',
    'bot was blocked',
    'bot was kicked',
    'user is deactivated',
  ];

  const lowerError = error.toLowerCase();
  return !nonRetryableErrors.some(msg => lowerError.includes(msg));
}

/**
 * Get retry delay based on error
 */
export function getRetryDelay(attempt: number): number {
  // Exponential backoff: 5, 10, 20 minutes
  return Math.pow(2, attempt) * 5 * 60 * 1000;
}
