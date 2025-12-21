/**
 * TelegramScriptLoader Component
 * 
 * Client Component для загрузки Telegram Login Widget script.
 * Использует Next.js <Script> с event handlers для observability.
 * 
 * Архитектура:
 * - Client Component ("use client") — необходимо для event handlers
 * - Server Component (layout.tsx) → Client Component (TelegramScriptLoader)
 * - Загружается ОДИН РАЗ глобально при загрузке приложения
 * 
 * Observability:
 * - onLoad: логирование успешной загрузки (dev mode)
 * - onError: логирование ошибок + TODO: Sentry tracking
 * 
 * Usage:
 * ```tsx
 * // src/app/layout.tsx
 * import { TelegramScriptLoader } from '@/components/TelegramScriptLoader';
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <TelegramScriptLoader />
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

"use client";

import Script from 'next/script';

export function TelegramScriptLoader() {
  return (
    <Script
      src="https://telegram.org/js/telegram-widget.js?22"
      strategy="lazyOnload"
      onLoad={() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[telegram] ✅ Widget script loaded globally');
        }
      }}
      onError={(e) => {
        console.error('[telegram] ❌ Failed to load widget script:', e);
        
        // TODO: Add Sentry tracking when ready
        // Example:
        // import * as Sentry from '@sentry/nextjs';
        // Sentry.captureException(e, {
        //   tags: { 
        //     component: 'telegram-widget',
        //     critical: 'true',
        //   },
        //   extra: { 
        //     scriptUrl: 'https://telegram.org/js/telegram-widget.js',
        //     timestamp: new Date().toISOString(),
        //   },
        // });
      }}
    />
  );
}
