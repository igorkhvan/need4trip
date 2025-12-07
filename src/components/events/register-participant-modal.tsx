"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RegisterParticipantForm } from "@/components/events/register-participant-form";
import { Event, EventCustomFieldSchema } from "@/lib/types/event";

interface RegisterParticipantModalProps {
  eventId: string;
  customFieldsSchema: EventCustomFieldSchema[];
  event?: Event;
  triggerLabel?: string;
}

export function RegisterParticipantModal({
  eventId,
  customFieldsSchema,
  event,
  triggerLabel = "Зарегистрироваться",
}: RegisterParticipantModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl md:p-8">
            <button
              aria-label="Закрыть"
              className="absolute right-4 top-4 rounded-full p-2 text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827]"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="space-y-6">
              <div className="space-y-2 pr-10">
                <h3 className="text-2xl font-semibold leading-tight text-[#111827]">
                  Регистрация экипажа
                </h3>
                <p className="text-sm text-[#6B7280]">
                  Заполните данные экипажа. После отправки вы появитесь в списке участников.
                </p>
              </div>
              <RegisterParticipantForm
                eventId={eventId}
                customFieldsSchema={customFieldsSchema}
                event={event}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
