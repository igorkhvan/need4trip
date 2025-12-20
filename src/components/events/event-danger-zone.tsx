"use client";

/**
 * Event Danger Zone Component
 * 
 * Owner-only section for critical event management actions:
 * - Delete event
 * 
 * Only visible to event owner.
 * Registration control moved to EventRegistrationControl component.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/use-toast";
import type { Event } from "@/lib/types/event";

interface EventDangerZoneProps {
  event: Event;
  isOwner: boolean;
}

export function EventDangerZone({ event, isOwner }: EventDangerZoneProps) {
  const router = useRouter();
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  
  if (!isOwner) return null;
  
  const handleDeleteEvent = async () => {
    setIsDeletingEvent(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Не удалось удалить событие');
      }
      
      toast({
        title: 'Событие удалено',
        description: 'Событие и все регистрации удалены',
      });
      
      router.push('/events');
    } catch (err) {
      toast({ 
        title: 'Ошибка', 
        description: err instanceof Error ? err.message : 'Произошла ошибка',
      });
      setIsDeletingEvent(false);
    }
  };
  
  return (
    <Card className="border-[var(--color-danger)] bg-[var(--color-danger-bg)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--color-danger)]">
          <span>⚠️</span>
          <span>Опасная зона</span>
        </CardTitle>
        <CardDescription>
          Необратимые действия. Используйте с осторожностью.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Delete Event */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-danger)] bg-white p-4">
          <div>
            <p className="font-medium text-[var(--color-danger)]">
              Удалить событие навсегда
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Событие и все регистрации участников будут удалены безвозвратно
            </p>
          </div>
          <ConfirmDialog
            trigger={
              <Button 
                variant="destructive" 
                className="w-full"
                disabled={isDeletingEvent}
              >
                <Trash2 className="icon-sm mr-2" />
                {isDeletingEvent ? 'Удаление...' : 'Удалить событие'}
              </Button>
            }
            title="Удалить событие навсегда?"
            description={`Будет удалено событие «${event.title}», все регистрации участников (${event.participantsCount || 0}) и все дополнительные данные. Это действие нельзя отменить!`}
            confirmText="Удалить навсегда"
            cancelText="Отмена"
            onConfirm={handleDeleteEvent}
            destructive
          />
        </div>
      </CardContent>
    </Card>
  );
}
