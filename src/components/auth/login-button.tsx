"use client";

import Script from "next/script";

interface LoginButtonProps {
  botUsername?: string;
}

export function LoginButton({ botUsername }: LoginButtonProps) {
  const username = botUsername || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (!username) {
    return (
      <div className="text-xs text-muted-foreground">
        Укажите NEXT_PUBLIC_TELEGRAM_BOT_USERNAME в .env.local
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <Script
        src="https://telegram.org/js/telegram-widget.js"
        data-telegram-login={username}
        data-size="medium"
        data-auth-url="/api/auth/telegram"
        data-request-access="write"
        strategy="lazyOnload"
      />
    </div>
  );
}
