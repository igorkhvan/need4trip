"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

interface LoginButtonProps {
  botUsername?: string;
  isAuthenticated?: boolean;
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

export function LoginButton({ botUsername, isAuthenticated }: LoginButtonProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const authUrl = useMemo(() => resolveAuthUrl(), []);
  const resolvedUsername =
    sanitizeBotUsername(botUsername) ||
    sanitizeBotUsername(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) ||
    null;

  const handleAuth = useCallback(() => {
    router.refresh();
  }, [router]);

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
    if (!container || !resolvedUsername || !authUrl || isAuthenticated) return;
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
  }, [authUrl, resolvedUsername, isAuthenticated]);

  if (isAuthenticated || !resolvedUsername) return null;

  return <div ref={containerRef} aria-label="Telegram Login" />;
}
