"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface LoginButtonProps {
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

function resolveAuthUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_TELEGRAM_AUTH_URL;
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
}

export function LoginButton({ isAuthenticated }: LoginButtonProps) {
  const [hasAuthed, setHasAuthed] = useState(false);
  const username = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!raw) return null;
    return raw.trim().replace(/^@+/, "") || null;
  }, []);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const authUrl = useMemo(() => resolveAuthUrl(), []);
  const handleAuth = useCallback(
    async (user: TelegramAuthPayload) => {
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const message = body?.message || body?.error || "Telegram auth failed";
          throw new Error(message);
        }
        setHasAuthed(true);
        const container = containerRef.current;
        if (container) container.innerHTML = "";
        router.refresh();
      } catch (err) {
        console.error("Telegram auth failed", err);
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
    if (!container || !username || !authUrl || isAuthenticated || hasAuthed) return;

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", username);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-auth-url", authUrl);
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth");
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [authUrl, username, isAuthenticated, hasAuthed]);

  if (isAuthenticated || hasAuthed || !username) return null;

  return <div ref={containerRef} aria-label="Telegram Login" />;
}
