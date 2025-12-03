"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface OwnerActionsProps {
  eventId: string;
  isOwner: boolean;
  authMissing: boolean;
}

export function OwnerActions({ eventId, isOwner, authMissing }: OwnerActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner) return null;

  const handleDelete = async () => {
    if (authMissing) {
      setError("Недостаточно прав / требуется DEV_USER_ID");
      return;
    }
    setError(null);
    setIsDeleting(true);
    try {
      if (!confirm("Удалить событие?")) {
        setIsDeleting(false);
        return;
      }
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Недостаточно прав / требуется DEV_USER_ID");
        } else {
          const body = await res.json().catch(() => ({}));
          setError(body?.message || "Не удалось удалить событие");
        }
        return;
      }
      router.push("/events");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить событие");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        asChild
        variant="secondary"
        disabled={authMissing}
        title={authMissing ? "Требуется DEV_USER_ID" : undefined}
      >
        <Link href={`/events/${eventId}/edit`}>Редактировать</Link>
      </Button>
      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={isDeleting || authMissing}
        title={authMissing ? "Требуется DEV_USER_ID" : undefined}
      >
        {isDeleting ? "Удаляем..." : "Удалить событие"}
      </Button>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
