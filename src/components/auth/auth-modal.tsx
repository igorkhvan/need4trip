"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dispatchAuthChanged } from "@/lib/events/auth-events";
import { debugTelegramWidget } from "@/lib/utils/telegram-widget-debug";

export type AuthModalReason = "REQUIRED" | "PAYWALL" | "REGISTER_ONLY" | "OWNER_ONLY";

export interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  afterLoginRedirectTo?: string;
  onSuccess?: () => void;
  reason?: AuthModalReason;
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
    onTelegramAuthModal?: (user: TelegramAuthPayload) => void;
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

function getReasonDescription(reason?: AuthModalReason): string {
  switch (reason) {
    case "PAYWALL":
      return "Чтобы управлять подпиской и клубом, войдите через Telegram.";
    case "REGISTER_ONLY":
      return "Регистрация доступна только для пользователей Telegram.";
    case "OWNER_ONLY":
      return "Только владелец может выполнить действие. Войдите.";
    case "REQUIRED":
    default:
      return "Чтобы продолжить, войдите через Telegram.";
  }
}

export function AuthModal({
  open,
  onOpenChange,
  title = "Войти в Need4Trip",
  description,
  afterLoginRedirectTo,
  onSuccess,
  reason,
}: AuthModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Debug: Log when modal state changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("[auth-modal] Modal state changed:", { open, title, reason });
    }
  }, [open, title, reason]);
  
  const username = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!raw) return null;
    return raw.trim().replace(/^@+/, "") || null;
  }, []);
  
  const authUrl = useMemo(() => resolveAuthUrl(), []);

  const finalDescription = description || getReasonDescription(reason);

  const handleAuth = useCallback(
    async (payload: TelegramAuthPayload) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setError(null);
      
      try {
        console.info("[auth-modal] onAuth received", payload?.id);
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { 
            error?: string; 
            message?: string;
            code?: string;
          };
          throw new Error(data.message || data.error || "Auth failed");
        }
        
        setIsAuthed(true);
        
        // Clear the widget (safe method - no XSS risk)
        const container = containerRef.current;
        if (container) {
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
        }
        
        // ВАЖНО: Подождать немного чтобы браузер применил Set-Cookie header
        // Cookie устанавливается в ответе от /api/auth/telegram
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Dispatch auth change event for components listening
        dispatchAuthChanged();
        
        // Refresh to get new currentUser (ОДИН раз, но после того как cookie применен)
        router.refresh();
        
        // Call success callback
        if (onSuccess) {
          setTimeout(() => onSuccess(), 100);
        }
        
        // Redirect if needed (но НЕ на ту же страницу)
        if (afterLoginRedirectTo) {
          setTimeout(() => router.push(afterLoginRedirectTo), 200);
        }
        
        // Close modal
        setTimeout(() => onOpenChange(false), 300);
      } catch (err) {
        console.error("[auth-modal] Telegram auth failed", err);
        setError(
          err instanceof Error 
            ? err.message 
            : "Не удалось войти через Telegram. Попробуйте еще раз."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, router, onSuccess, afterLoginRedirectTo, onOpenChange]
  );

  // Setup global callback
  useEffect(() => {
    if (open) {
      window.onTelegramAuthModal = (user) => {
        void handleAuth(user);
      };
    }
    return () => {
      delete window.onTelegramAuthModal;
    };
  }, [open, handleAuth]);

  // Load Telegram widget when modal opens
  useEffect(() => {
    if (!open || !username || isAuthed) {
      if (open && !username && process.env.NODE_ENV === 'development') {
        console.error("[auth-modal] NEXT_PUBLIC_TELEGRAM_BOT_USERNAME not set");
      }
      return;
    }

    // Wait for container to be mounted with a retry mechanism
    let timeoutId: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 10;
    
    const initWidget = () => {
      const container = containerRef.current;
      
      if (!container) {
        // Retry if container is not ready yet
        if (retryCount < maxRetries) {
          retryCount++;
          timeoutId = setTimeout(initWidget, 50);
        } else {
          console.error("[auth-modal] Container ref is null after max retries");
        }
        return;
      }

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
      script.setAttribute("data-onauth", "onTelegramAuthModal(user)");
      
      // Add error handler
      script.onerror = (error) => {
        console.error("[auth-modal] Failed to load Telegram Widget script:", error);
      };
      
      container.appendChild(script);
    };
    
    // Start initialization with a small delay
    timeoutId = setTimeout(initWidget, 100);

    return () => {
      clearTimeout(timeoutId);
      const container = containerRef.current;
      if (container) {
        // Clear container (safe method - no XSS risk)
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };
  }, [open, authUrl, username, isAuthed]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-h3 text-[var(--color-text)]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-body-small">
            {finalDescription}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 py-3 sm:gap-4 sm:py-4">
          {/* Debug Info - только в development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs">
              <div className="font-semibold mb-1">🔍 Debug Info:</div>
              <div>• open: {String(open)}</div>
              <div>• username: {username || '❌ NOT SET'}</div>
              <div>• authUrl: {authUrl || 'auto'}</div>
              <div>• isSubmitting: {String(isSubmitting)}</div>
              <div>• hasContainer: {String(!!containerRef.current)}</div>
              <div className="mt-2 pt-2 border-t border-blue-300">
                <button
                  type="button"
                  onClick={() => {
                    console.clear();
                    debugTelegramWidget();
                  }}
                  className="text-blue-700 underline hover:text-blue-900"
                >
                  🐛 Run Diagnostics (check console)
                </button>
              </div>
            </div>
          )}
          
          {/* Telegram Widget Container */}
          <div className="flex justify-center">
            {isSubmitting ? (
              <div className="flex items-center gap-2 text-base text-[var(--color-text-muted)]">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent"></div>
                <span>Авторизация...</span>
              </div>
            ) : !username ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                <div className="mb-2 text-red-600 font-semibold">⚠️ Конфигурация не завершена</div>
                <div className="text-sm text-red-700">
                  <code>NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code> не установлен
                </div>
              </div>
            ) : (
              <div ref={containerRef} aria-label="Telegram Login" className="min-h-[46px]" />
            )}
          </div>
          
          {/* Error Message */}
          {error && (
            <div 
              className="rounded-xl border border-[var(--color-danger-bg)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-text)]" 
              role="alert"
            >
              {error}
            </div>
          )}
          
          {/* Info */}
          {!error && !isSubmitting && username && (
            <div className="text-center text-sm text-[var(--color-text-muted)]">
              Войдите через Telegram, чтобы получить доступ ко всем возможностям Need4Trip
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

