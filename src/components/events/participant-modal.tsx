"use client";

import { useEffect, useState } from "react";
import { X, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [open]);

  const handleSuccess = () => {
    setOpen(false);
    onSuccess?.();
  };

  const title = mode === "create" ? "Регистрация экипажа" : "Редактирование регистрации";
  const description =
    mode === "create"
      ? "Заполните данные экипажа. После отправки вы появитесь в списке участников."
      : "Обновите данные экипажа для организатора.";

  return (
    <>
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

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
            <button
              aria-label="Закрыть"
              className="absolute right-4 top-4 rounded-full p-2 text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-6 text-left">
              <div className="space-y-2 pr-10">
                <h3 className="text-2xl font-semibold leading-tight text-[#111827]">
                  {title}
                </h3>
                <p className="text-sm text-[#6B7280]">{description}</p>
              </div>
              <ParticipantForm
                mode={mode}
                eventId={eventId}
                participantId={participantId}
                customFieldsSchema={customFieldsSchema}
                event={event}
                initialValues={initialValues}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

