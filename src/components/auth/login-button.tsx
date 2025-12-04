"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

interface LoginButtonProps {
  botUsername?: string;
}

type TelegramAuthPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthPayload) => void;
  }
}

export function LoginButton({ botUsername }: LoginButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const username = botUsername || process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const authUrl = process.env.NEXT_PUBLIC_TELEGRAM_AUTH_URL || "/api/auth/telegram";

  const handleAuth = useCallback(
    async (user: TelegramAuthPayload) => {
      try {
        setError(null);
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const message =
            body?.message || body?.error || "Не удалось авторизоваться через Telegram";
          setError(message);
          return;
        }
        startTransition(() => router.refresh());
      } catch (err) {
        console.error("Telegram auth failed", err);
        setError("Не удалось авторизоваться через Telegram");
      }
    },
    [router]
  );

  useEffect(() => {
    window.onTelegramAuth = (user: TelegramAuthPayload) => {
      handleAuth(user);
    };
    return () => {
      delete window.onTelegramAuth;
    };
  }, [handleAuth]);

  if (!username) {
    return (
      <Button variant="default" size="sm" disabled>
        Укажите NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Script
        src="https://telegram.org/js/telegram-widget.js?22"
        data-telegram-login={username}
        data-size="large"
        data-auth-url={authUrl}
        data-request-access="write"
        data-onauth="onTelegramAuth"
        strategy="afterInteractive"
      />
      <div className="text-xs text-muted-foreground">
        {isPending ? "Завершаем вход..." : "Войти через Telegram"}
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
