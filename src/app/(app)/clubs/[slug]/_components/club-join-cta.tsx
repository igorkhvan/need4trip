/**
 * ClubJoinCTA Component
 * 
 * Primary CTA Zone for Club Profile page.
 * Per Visual Contract v6 §5: Maximum one CTA, state-driven.
 * 
 * States (per Visual Contract v6 §5):
 * - Guest + openJoinEnabled=true → "Вступить в клуб" (direct join via API-020)
 * - Guest + openJoinEnabled=false → "Подать заявку" (join request via API-052)
 * - Pending request → "Ожидает одобрения" (disabled)
 * - Member / Owner / Admin → NO CTA (component returns null)
 * - Archived → NO CTA (handled by parent, but also checked here)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";

interface ClubJoinCTAProps {
  clubId: string;
  isAuthenticated: boolean;
  isMember: boolean;
  isPending: boolean;
  isArchived: boolean;
  openJoinEnabled: boolean;
}

export function ClubJoinCTA({
  clubId,
  isAuthenticated,
  isMember,
  isPending,
  isArchived,
  openJoinEnabled,
}: ClubJoinCTAProps) {
  const router = useRouter();
  const { openModal } = useAuthModalContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per Visual Contract v6 §5.3, §5.4: Hide CTA if member, owner, admin, or archived
  if (isMember || isArchived) {
    return null;
  }

  // Per Visual Contract v6 §5.2: Pending state - disabled CTA
  if (isPending) {
    return (
      <Button disabled className="w-full sm:w-auto">
        <Clock className="h-4 w-4" />
        <span>Ожидает одобрения</span>
      </Button>
    );
  }

  // Handle auth modal for unauthenticated users (canonical pattern)
  const handleAuthRequired = () => {
    openModal({
      reason: "REQUIRED",
      title: "Войти в Need4Trip",
      description: "Чтобы вступить в клуб, войдите через Telegram.",
      afterLoginRedirectTo: `/clubs/${clubId}`,
    });
  };

  // Handle direct join (when openJoinEnabled=true)
  const handleDirectJoin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/clubs/${clubId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthRequired();
          return;
        }
        if (res.status === 409) {
          setError(data.error?.message || "Вы уже состоите в клубе");
          return;
        }
        if (res.status === 403) {
          setError("Клуб не принимает новых участников");
          return;
        }
        throw new Error(data.error?.message || "Ошибка вступления в клуб");
      }

      // Success - refresh page to update state
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle join request (when openJoinEnabled=false)
  const handleJoinRequest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/clubs/${clubId}/join-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          handleAuthRequired();
          return;
        }
        if (res.status === 409) {
          setError(data.error?.message || "Вы уже отправили запрос");
          return;
        }
        if (res.status === 403) {
          setError("Клуб в архиве");
          return;
        }
        throw new Error(data.error?.message || "Ошибка отправки запроса");
      }

      // Success - refresh page to update state
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  // Guest (not authenticated) - prompt to log in via AuthModal
  if (!isAuthenticated) {
    return (
      <Button onClick={handleAuthRequired} className="w-full sm:w-auto">
        <UserPlus className="h-4 w-4" />
        <span>{openJoinEnabled ? "Вступить в клуб" : "Подать заявку"}</span>
      </Button>
    );
  }

  // Authenticated, not member, not pending
  return (
    <div>
      {error && (
        <div className="p-3 mb-3 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)]">
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        </div>
      )}
      
      <Button
        onClick={openJoinEnabled ? handleDirectJoin : handleJoinRequest}
        disabled={isLoading}
        className="w-full sm:w-auto"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Отправка...</span>
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            <span>{openJoinEnabled ? "Вступить в клуб" : "Подать заявку"}</span>
          </>
        )}
      </Button>
    </div>
  );
}
