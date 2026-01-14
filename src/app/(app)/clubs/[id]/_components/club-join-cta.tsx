/**
 * ClubJoinCTA Component
 * 
 * Join/Request CTA for Club Profile (Public) page.
 * Per Visual Contract v2 §5.6: Blocking render.
 * 
 * States (per Visual Contract v2):
 * - unauthenticated → prompt to log in
 * - already member → CTA hidden
 * - pending request → disabled CTA with status
 * - archived → CTA hidden
 * 
 * Action: POST /api/clubs/[id]/join-requests (API-052)
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClubJoinCTAProps {
  clubId: string;
  isAuthenticated: boolean;
  isMember: boolean;
  isPending: boolean;
  isArchived: boolean;
}

export function ClubJoinCTA({
  clubId,
  isAuthenticated,
  isMember,
  isPending,
  isArchived,
}: ClubJoinCTAProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Per Visual Contract v2 §5.6: Hide CTA if already member or archived
  if (isMember || isArchived) {
    return null;
  }

  // Handle login redirect for unauthenticated users
  const handleLoginClick = () => {
    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(`/clubs/${clubId}`);
    router.push(`/login?returnUrl=${returnUrl}`);
  };

  // Handle join request submission
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
        // Handle specific error codes per API-052
        if (res.status === 401) {
          setError("Требуется авторизация");
          return;
        }
        if (res.status === 409) {
          // Already pending or member
          setError(data.error?.message || "Вы уже отправили запрос");
          return;
        }
        if (res.status === 403) {
          setError("Клуб в архиве");
          return;
        }
        throw new Error(data.error?.message || "Ошибка отправки запроса");
      }

      setSuccess(true);
      // Refresh page to update state
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      {/* Success state */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#F0FDF4] border border-[#16A34A]/20 mb-4">
          <Clock className="h-5 w-5 text-[#16A34A]" />
          <div>
            <p className="font-medium text-[#16A34A]">Запрос отправлен!</p>
            <p className="text-sm text-[#166534]">
              Ожидайте подтверждения от владельца клуба
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-[#FEF2F2] border border-[#DC2626]/20 mb-4">
          <p className="text-sm text-[#DC2626]">{error}</p>
        </div>
      )}

      {/* Unauthenticated state - per Visual Contract v2 §5.6 */}
      {!isAuthenticated && !success && (
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Войдите, чтобы подать заявку на вступление в клуб
          </p>
          <Button onClick={handleLoginClick} className="w-full sm:w-auto">
            <LogIn className="h-4 w-4" />
            <span>Войти через Telegram</span>
          </Button>
        </div>
      )}

      {/* Pending state - per Visual Contract v2 §5.6 */}
      {isAuthenticated && isPending && !success && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#FFFBEB] border border-[#D97706]/20">
          <Clock className="h-5 w-5 text-[#D97706]" />
          <div className="flex-1">
            <p className="font-medium text-[#92400E]">Заявка на рассмотрении</p>
            <p className="text-sm text-[#A16207]">
              Ваш запрос ожидает подтверждения от владельца клуба
            </p>
          </div>
        </div>
      )}

      {/* Join request button - for authenticated non-members */}
      {isAuthenticated && !isPending && !success && (
        <Button
          onClick={handleJoinRequest}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Отправка...</span>
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              <span>Подать заявку на вступление</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
