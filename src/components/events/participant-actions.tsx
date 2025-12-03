"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface ParticipantActionsProps {
  eventId: string;
  participantId: string;
  canEdit: boolean;
  canRemove: boolean;
  isOwner: boolean;
  authMissing: boolean;
}

export function ParticipantActions({
  eventId,
  participantId,
  canEdit,
  canRemove,
  isOwner,
  authMissing,
}: ParticipantActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!canRemove || authMissing) {
      setError("Недостаточно прав / требуется DEV_USER_ID");
      return;
    }
    if (!confirm("Удалить участника?")) {
      return;
    }
    setError(null);
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/events/${eventId}/participants/${participantId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Недостаточно прав / требуется DEV_USER_ID");
        } else if (res.status === 409) {
          setError("Достигнут лимит участников");
        } else {
          const body = await res.json().catch(() => ({}));
          setError(body?.message || "Не удалось удалить участие");
        }
        return;
      }
      toast({ title: "Удалено", description: "Участник удалён" });
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Произошла ошибка. Повторите попытку."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canEdit && !canRemove && !isOwner) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/events/${eventId}/participants/${participantId}/edit`}>
            Редактировать
          </Link>
        </Button>
      ) : null}
      {isOwner && !canEdit && (
        <span className="text-xs text-muted-foreground">Управление владельца</span>
      )}
      {canRemove && (
        <Button
          variant={isOwner ? "destructive" : "outline"}
          size="sm"
          disabled={isDeleting || authMissing}
          onClick={handleDelete}
          title={authMissing ? "Требуется DEV_USER_ID" : undefined}
        >
          {isDeleting ? "Удаляем..." : isOwner ? "Удалить" : "Отменить участие"}
        </Button>
      )}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
