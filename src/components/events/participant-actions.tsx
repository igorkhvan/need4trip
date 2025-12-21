"use client";

import { useState } from "react";

import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ParticipantModal } from "@/components/events/participant-modal";
import { Event, EventCustomFieldSchema } from "@/lib/types/event";
import { ParticipantRole } from "@/lib/types/participant";
import { toast, showError, TOAST } from "@/lib/utils/toastHelpers";

interface ParticipantActionsProps {
  eventId: string;
  participantId: string;
  canEdit: boolean;
  canRemove: boolean;
  isOwner: boolean;
  authMissing: boolean;
  customFieldsSchema?: EventCustomFieldSchema[];
  participantData?: {
    displayName: string;
    role: ParticipantRole;
    customFieldValues: Record<string, unknown>;
  };
  event?: Event;
  onDeleteSuccess?: () => void;
  onEditSuccess?: () => void;
}

export function ParticipantActions({
  eventId,
  participantId,
  canEdit,
  canRemove,
  isOwner,
  authMissing,
  customFieldsSchema = [],
  participantData,
  event,
  onDeleteSuccess,
  onEditSuccess,
}: ParticipantActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!canRemove || authMissing) {
      showError("Недостаточно прав / войдите через Telegram");
      return;
    }
    setError(null);
    setIsDeleting(true);
    
    try {
      // Call optimistic UI handler
      if (onDeleteSuccess) {
        await onDeleteSuccess();
      }
    } catch (e) {
      showError(e, "Не удалось удалить участника");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canEdit && !canRemove && !isOwner) return null;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {canEdit && participantData ? (
        <ParticipantModal
          mode="edit"
          eventId={eventId}
          participantId={participantId}
          customFieldsSchema={customFieldsSchema}
          event={event}
          initialValues={participantData}
          iconOnly
          onSuccess={onEditSuccess}
        />
      ) : null}
      {canRemove && (
        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              size="icon"
              disabled={isDeleting || authMissing}
              title={authMissing ? "Требуется авторизация через Telegram" : "Удалить участника"}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          }
          title="Удалить участника?"
          description={
            participantData?.displayName
              ? `${participantData.displayName} будет удалён из списка участников. Это действие нельзя отменить.`
              : "Участник будет удалён из списка. Это действие нельзя отменить."
          }
          confirmText="Удалить"
          cancelText="Отмена"
          onConfirm={handleDelete}
          destructive
        />
      )}
      {error && <div className="absolute top-full right-0 mt-1 text-xs text-red-600 whitespace-nowrap">{error}</div>}
    </div>
  );
}
