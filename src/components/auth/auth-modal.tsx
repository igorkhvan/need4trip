"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
        
        // Clear the widget
        const container = containerRef.current;
        if (container) container.innerHTML = "";
        
        // Dispatch auth change event for components listening
        window.dispatchEvent(new Event("auth-changed"));
        
        // Refresh to get new currentUser
        router.refresh();
        
        // Call success callback
        if (onSuccess) {
          setTimeout(() => onSuccess(), 100);
        }
        
        // Redirect if needed
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
      if (open && !username) {
        console.error("[auth-modal] ❌ NEXT_PUBLIC_TELEGRAM_BOT_USERNAME not set!");
      }
      return;
    }

    // Wait for container to be mounted with a retry mechanism
    let timeoutId: NodeJS.Timeout;
    let retryCount = 0;
    const maxRetries = 10;
    
    const initWidget = () => {
      const container = containerRef.current;
      
      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log("[auth-modal] Widget init attempt:", {
          open,
          hasContainer: !!container,
          username,
          authUrl,
          isAuthed,
          retryCount,
        });
      }
      
      if (!container) {
        // Retry if container is not ready yet
        if (retryCount < maxRetries) {
          retryCount++;
          timeoutId = setTimeout(initWidget, 50);
        } else {
          console.error("[auth-modal] ❌ Container ref is null after max retries!");
        }
        return;
      }

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
      script.setAttribute("data-onauth", "onTelegramAuthModal(user)");
      
      if (process.env.NODE_ENV === 'development') {
        console.log("[auth-modal] ✅ Appending Telegram Widget script", { username, authUrl });
      }
      container.appendChild(script);
    };
    
    // Start initialization with a small delay
    timeoutId = setTimeout(initWidget, 100);

    return () => {
      clearTimeout(timeoutId);
      const container = containerRef.current;
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [open, authUrl, username, isAuthed]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[20px] font-semibold text-[#1F2937]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[15px] text-[#6B7280]">
            {finalDescription}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded border border-blue-200 bg-blue-50 p-2 text-xs">
              <div>🔍 Debug:</div>
              <div>• open: {String(open)}</div>
              <div>• username: {username || '❌ NOT SET'}</div>
              <div>• authUrl: {authUrl || 'auto'}</div>
              <div>• isSubmitting: {String(isSubmitting)}</div>
              <div>• hasContainer: {String(!!containerRef.current)}</div>
            </div>
          )}
          
          {/* Telegram Widget Container */}
          <div className="flex justify-center">
            {isSubmitting ? (
              <div className="flex items-center gap-2 text-[15px] text-[#6B7280]">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FF6F2C] border-t-transparent"></div>
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
              className="rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] p-3 text-[14px] text-[#991B1B]" 
              role="alert"
            >
              {error}
            </div>
          )}
          
          {/* Info */}
          {!error && !isSubmitting && username && (
            <div className="text-center text-[13px] text-[#6B7280]">
              Войдите через Telegram, чтобы получить доступ ко всем возможностям Need4Trip
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

