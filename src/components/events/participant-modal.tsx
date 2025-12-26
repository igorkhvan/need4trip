"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { ParticipantForm } from "@/components/events/participant-form";
import { Event, EventCustomFieldSchema } from "@/lib/types/event";
import { ParticipantRole } from "@/lib/types/participant";

interface ParticipantModalProps {
  mode: "create" | "edit";
  eventId: string;
  customFieldsSchema: EventCustomFieldSchema[];
  event?: Event;
  triggerLabel?: string;
  participantId?: string;
  initialValues?: {
    displayName?: string;
    role?: ParticipantRole;
    customFieldValues?: Record<string, unknown>;
  };
  onSuccess?: () => void;
  iconOnly?: boolean;
}

export function ParticipantModal({
  mode,
  eventId,
  customFieldsSchema,
  event,
  triggerLabel,
  participantId,
  initialValues,
  onSuccess,
  iconOnly = false,
}: ParticipantModalProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    onSuccess?.();
  };

  const title = mode === "create" ? "Регистрация на событие" : "Обновление данных регистрации";
  const description =
    mode === "create"
      ? "Заполните данные. После отправки вы будете добавлены в список участников."
      : "Обновите данные, чтобы организатор видел актуальную информацию.";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {iconOnly ? (
        <Button 
          onClick={() => setOpen(true)} 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          title="Редактировать участника"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)} variant={mode === "edit" ? "secondary" : "default"}>
          {triggerLabel || (mode === "create" ? "Зарегистрироваться" : "Редактировать данные")}
        </Button>
      )}

      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="heading-h3">{title}</DialogTitle>
          <DialogDescription className="text-body-small">{description}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <ParticipantForm
            mode={mode}
            eventId={eventId}
            participantId={participantId}
            customFieldsSchema={customFieldsSchema}
            event={event}
            initialValues={initialValues}
            onSuccess={handleSuccess}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

