"use client";

/**
 * Event Danger Zone Component
 * 
 * Owner-only section for critical event management actions:
 * - Toggle registration (manually close/open)
 * - Delete event
 * 
 * Only visible to event owner.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Lock, Unlock } from "lucide-react";

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
  const [isTogglingRegistration, setIsTogglingRegistration] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  
  if (!isOwner) return null;
  
  const handleToggleRegistration = async () => {
    setIsTogglingRegistration(true);
    try {
      const res = await fetch(`/api/events/${event.id}/registration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationManuallyClosed: !event.registrationManuallyClosed
        })
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || 'Не удалось изменить статус регистрации');
      }
      
      toast({
        title: event.registrationManuallyClosed ? 'Регистрация открыта' : 'Регистрация закрыта',
        description: event.registrationManuallyClosed
          ? 'Участники снова могут регистрироваться на событие'
          : 'Только вы сможете добавлять участников',
      });
      
      router.refresh();
    } catch (err) {
      toast({ 
        title: 'Ошибка', 
        description: err instanceof Error ? err.message : 'Произошла ошибка',
        variant: 'destructive'
      });
    } finally {
      setIsTogglingRegistration(false);
    }
  };
  
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
        variant: 'destructive'
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
      <CardContent className="space-y-4">
        {/* Toggle Registration */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="font-medium text-[var(--color-text)]">
              {event.registrationManuallyClosed ? 'Открыть регистрацию' : 'Закрыть регистрацию'}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {event.registrationManuallyClosed 
                ? 'Участники снова смогут регистрироваться на событие'
                : 'Только вы сможете добавлять участников (даже если дата не прошла)'
              }
            </p>
          </div>
          <Button
            variant={event.registrationManuallyClosed ? 'default' : 'destructive'}
            onClick={handleToggleRegistration}
            disabled={isTogglingRegistration}
            className="w-full sm:w-auto"
          >
            {event.registrationManuallyClosed ? (
              <>
                <Unlock className="icon-sm mr-2" />
                Открыть
              </>
            ) : (
              <>
                <Lock className="icon-sm mr-2" />
                Закрыть
              </>
            )}
          </Button>
        </div>
        
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
            description={
              <>
                <p className="mb-2">Будет удалено:</p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  <li>Событие «{event.title}»</li>
                  <li>Все регистрации участников ({event.participantsCount || 0})</li>
                  <li>Все дополнительные данные</li>
                </ul>
                <p className="mt-3 font-semibold text-[var(--color-danger)]">
                  Это действие нельзя отменить!
                </p>
              </>
            }
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
