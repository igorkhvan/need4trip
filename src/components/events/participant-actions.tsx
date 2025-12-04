"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Pencil, Trash2 } from "lucide-react";

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
      setError("Недостаточно прав / войдите через Telegram");
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
          setError("Недостаточно прав / войдите через Telegram");
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
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? (
          <Button variant="ghost" size="icon" asChild title="Редактировать участника">
            <Link href={`/events/${eventId}/participants/${participantId}/edit`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            disabled={isDeleting || authMissing}
            onClick={handleDelete}
            title={authMissing ? "Требуется авторизация через Telegram" : "Удалить участника"}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        )}
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
