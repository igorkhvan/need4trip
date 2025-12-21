/**
 * Telegram Widget Type Definitions
 * 
 * Adds TypeScript types for Telegram Login Widget global objects
 */

declare global {
  interface Window {
    /**
     * Telegram Widget API
     * Script: https://telegram.org/js/telegram-widget.js
     */
    Telegram?: {
      Login?: {
        /**
         * Initialize Telegram Login Widget on a DOM element
         * @param element - HTMLElement with data-telegram-login attribute
         */
        init: (element: HTMLElement) => void;
      };
    };
    
    /**
     * Global callback for auth-modal.tsx
     * Called by Telegram Widget after successful authentication
     */
    onTelegramAuthModal?: (user: TelegramAuthPayload) => void;
    
    /**
     * Global callback for login-button.tsx
     * Called by Telegram Widget after successful authentication
     */
    onTelegramAuth?: (user: TelegramAuthPayload) => void;
  }
}

/**
 * Telegram Authentication Payload
 * Returned by Telegram Widget on successful authentication
 */
export type TelegramAuthPayload = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
};

export {};
