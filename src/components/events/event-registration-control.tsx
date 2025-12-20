"use client";

/**
 * Event Registration Control Component
 * 
 * Owner-only section for managing event registration status:
 * - Toggle registration open/closed
 * - Show locked indicator if closed by owner
 * - Disable toggle for past events
 * 
 * Only visible to event owner.
 * Separated from EventDangerZone (not a "dangerous" action)
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { LockedIndicator } from "@/components/ui/locked-indicator";
import { useSaveScroll } from "@/hooks/use-scroll-save";
import type { Event } from "@/lib/types/event";

interface EventRegistrationControlProps {
  event: Event;
  isOwner: boolean;
}

export function EventRegistrationControl({ event, isOwner }: EventRegistrationControlProps) {
  const router = useRouter();
  const saveScroll = useSaveScroll();
  const [isToggling, setIsToggling] = useState(false);
  
  if (!isOwner) return null;
  
  // Check if event is in the past (disable toggle)
  const isPastEvent = new Date(event.dateTime) <= new Date();
  const isDisabled = isPastEvent || isToggling;
  
  const handleToggleRegistration = async () => {
    setIsToggling(true);
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
        throw new Error(body?.error?.message || 'Не удалось изменить статус регистрации');
      }
      
      toast({
        title: event.registrationManuallyClosed ? 'Регистрация открыта' : 'Регистрация закрыта',
        description: event.registrationManuallyClosed
          ? 'Участники снова могут регистрироваться на событие'
          : 'Только вы сможете добавлять участников',
      });

      // Сохранить scroll position ПЕРЕД router.refresh()
      saveScroll();
      
      router.refresh();
    } catch (err) {
      toast({ 
        title: 'Ошибка', 
        description: err instanceof Error ? err.message : 'Произошла ошибка',
      });
    } finally {
      setIsToggling(false);
    }
  };
  
  return (
    <Card className="border-[var(--color-border)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--color-text)]">
          <span>Управление регистрацией</span>
        </CardTitle>
        <CardDescription>
          Контроль доступа к регистрации на событие
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        {event.registrationManuallyClosed && !isPastEvent && (
          <div className="rounded-lg bg-orange-50 p-3">
            <LockedIndicator 
              message="Регистрация закрыта вами" 
              size="md"
            />
          </div>
        )}
        
        {/* Toggle Registration Control */}
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
            disabled={isDisabled}
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
        
        {/* Past Event Hint */}
        {isPastEvent && (
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-[var(--color-text-muted)]">
            Событие уже прошло, поэтому управление регистрацией недоступно
          </div>
        )}
      </CardContent>
    </Card>
  );
}
