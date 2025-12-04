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
  const build = (raw: string | null) => {
    if (!raw) return null;
    const withScheme = raw.startsWith("http") ? raw : `https://${raw}`;
    const url = new URL(withScheme);
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/api/auth/telegram";
    }
    return url;
  };

  const envUrl = build(process.env.NEXT_PUBLIC_TELEGRAM_AUTH_URL ?? null);
  if (typeof window !== "undefined") {
    const current = new URL(window.location.origin);
    const preferred = envUrl && envUrl.host === current.host ? envUrl : null;
    const url = preferred ?? build(current.origin);
    return url?.toString() ?? null;
  }

  return envUrl?.toString() ?? null;
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
  const handleAuth = useCallback(() => {
    setHasAuthed(true);
    const container = containerRef.current;
    if (container) container.innerHTML = "";
    router.refresh();
  }, [router]);

  useEffect(() => {
    window.onTelegramAuth = () => {
      handleAuth();
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
    if (authUrl) {
      script.setAttribute("data-auth-url", authUrl);
    }
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
