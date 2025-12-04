"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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

function sanitizeBotUsername(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^@+/, "");
  const isValidLength = cleaned.length >= 5 && cleaned.length <= 32;
  const pattern = /^[a-zA-Z][a-zA-Z0-9_]*bot$/i;
  if (!cleaned || !isValidLength || !pattern.test(cleaned)) return null;
  return cleaned;
}

function resolveAuthUrl(): string | null {
  const buildUrl = (base: string | null) => {
    if (!base) return null;
    const withScheme = base.startsWith("http") ? base : `https://${base}`;
    try {
      const url = new URL(withScheme);
      if (url.pathname === "/" || url.pathname === "") {
        url.pathname = "/api/auth/telegram";
      }
      return url.toString();
    } catch {
      return null;
    }
  };

  const fromEnv = buildUrl(process.env.NEXT_PUBLIC_TELEGRAM_AUTH_URL ?? null);
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    return buildUrl(window.location.origin);
  }
  return null;
}

export function LoginButton({ botUsername }: LoginButtonProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const authUrl = useMemo(() => resolveAuthUrl(), []);
  const resolvedUsername =
    sanitizeBotUsername(botUsername) ||
    sanitizeBotUsername(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) ||
    null;

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !resolvedUsername || !authUrl) return;
    // Avoid duplicating the widget on re-render.
    if (container.querySelector("iframe")) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", resolvedUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-auth-url", authUrl);
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth");
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [authUrl, resolvedUsername]);

  if (!resolvedUsername) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button variant="default" size="sm" disabled title="Telegram недоступен">
          Войти через Telegram
        </Button>
        <div className="text-xs text-muted-foreground">Авторизация временно недоступна</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div ref={containerRef} aria-label="Telegram Login" />
      <div className="text-xs text-muted-foreground">
        {isPending ? "Завершаем вход..." : "Войти через Telegram"}
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
