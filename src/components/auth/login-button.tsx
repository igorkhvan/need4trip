"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface LoginButtonProps {
  isAuthenticated?: boolean;
}

type TelegramAuthPayload = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthPayload) => void;
  }
}

function resolveAuthUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_TELEGRAM_AUTH_URL ?? null;
  const build = (source: string) => {
    const withScheme = source.startsWith("http") ? source : `https://${source}`;
    const url = new URL(withScheme);
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/api/auth/telegram";
    }
    return url.toString();
  };

  if (raw) return build(raw);
  if (typeof window !== "undefined") {
    return build(window.location.origin);
  }
  return null;
}

export function LoginButton({ isAuthenticated }: LoginButtonProps) {
  const [hasAuthed, setHasAuthed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const username = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!raw) return null;
    return raw.trim().replace(/^@+/, "") || null;
  }, []);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const authUrl = useMemo(() => resolveAuthUrl(), []);
  const handleAuth = useCallback(
    async (payload: TelegramAuthPayload) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setError(null);
      try {
        console.info("[telegram-login] onAuth received", payload?.id);
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
          throw new Error(data.message || data.error || "Auth failed");
        }
        setHasAuthed(true);
        const container = containerRef.current;
        if (container) {
          // Clear container (safe method - no XSS risk)
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
        }
        router.refresh();
      } catch (err) {
        console.error("Telegram auth failed", err);
        setError("Не удалось войти через Telegram. Попробуйте еще раз.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, router]
  );

  useEffect(() => {
    window.onTelegramAuth = (user) => {
      void handleAuth(user);
    };
    return () => {
      delete window.onTelegramAuth;
    };
  }, [handleAuth]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !username || isAuthenticated || hasAuthed) return;

    // Clear container (safe method - no XSS risk)
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", username);
    script.setAttribute("data-size", "large");
    if (authUrl) {
      script.setAttribute("data-auth-url", authUrl);
    }
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    container.appendChild(script);

    return () => {
      // Clear container (safe method - no XSS risk)
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };
  }, [authUrl, username, isAuthenticated, hasAuthed]);

  if (isAuthenticated || hasAuthed || !username) return null;

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} aria-label="Telegram Login" />
      {error && (
        <div className="text-xs text-red-500" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
