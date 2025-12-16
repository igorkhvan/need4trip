"use client";

/**
 * ParticipantsTableClient Component
 * 
 * Client компонент для отображения таблицы участников с optimistic UI.
 * Управляет локальным state и мгновенно обновляет UI.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { useSimpleOptimistic } from "@/hooks/use-optimistic-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ParticipantActions } from "@/components/events/participant-actions";
import { formatCustomFieldValue, formatParticipantRole } from "@/lib/utils/customFields";
import type { EventParticipant } from "@/lib/types/participant";
import type { Event } from "@/lib/types/event";

interface ParticipantsTableClientProps {
  initialParticipants: EventParticipant[];
  event: Event;
  isOwner: boolean;
  currentUserId?: string | null;
  guestSessionId?: string | null;
}

export function ParticipantsTableClient({
  initialParticipants,
  event,
  isOwner,
  currentUserId,
  guestSessionId,
}: ParticipantsTableClientProps) {
  const router = useRouter();
  const [participants, setParticipants] = useState(initialParticipants);
  
  // Optimistic state for participants
  const { optimisticState: optimisticParticipants, setOptimistic: setOptimisticParticipants } = 
    useSimpleOptimistic<EventParticipant[]>(participants);

  // Sync optimistic state with actual state
  useEffect(() => {
    setOptimisticParticipants(participants);
  }, [participants, setOptimisticParticipants]);

  // Update participants when initialParticipants change (from server refresh)
  useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants]);

  const sortedCustomFields = [...(event.customFieldsSchema || [])].sort(
    (a, b) => a.order - b.order
  );

  const handleDeleteParticipant = async (participantId: string) => {
    // Optimistic update: remove participant immediately
    const previousParticipants = [...participants];
    setOptimisticParticipants(optimisticParticipants.filter(p => p.id !== participantId));

    try {
      const res = await fetch(
        `/api/events/${event.id}/participants/${participantId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        // Rollback on error
        setOptimisticParticipants(previousParticipants);
        
        if (res.status === 401 || res.status === 403) {
          toast({ 
            title: "Ошибка", 
            description: "Недостаточно прав / войдите через Telegram",
          });
        } else {
          const body = await res.json().catch(() => ({}));
          toast({ 
            title: "Ошибка", 
            description: body?.message || "Не удалось удалить участника",
          });
        }
        return;
      }

      // Success - update real state
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      toast({ title: "Удалено", description: "Участник удалён" });
      
      // Refresh to get updated counts
      router.refresh();
    } catch (e) {
      // Rollback on error
      setOptimisticParticipants(previousParticipants);
      toast({ 
        title: "Ошибка", 
        description: e instanceof Error ? e.message : "Произошла ошибка",
      });
    }
  };

  const handleEditSuccess = () => {
    router.refresh();
  };

  if (optimisticParticipants.length === 0) {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-12 text-center">
        <p className="text-[15px] text-[#6B7280]">
          Пока нет зарегистрированных участников
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#E5E7EB]">
      <Table>
        <TableHeader className="bg-[#F9FAFB]">
          <TableRow className="border-b border-[#E5E7EB]">
            <TableHead className="w-16 text-center text-[13px] font-semibold uppercase text-[#6B7280]">
              №
            </TableHead>
            <TableHead className="text-[13px] font-semibold uppercase text-[#6B7280]">
              Экипаж
            </TableHead>
            <TableHead className="text-[13px] font-semibold uppercase text-[#6B7280]">
              Роль
            </TableHead>
            {sortedCustomFields.length > 0 && (
              <TableHead className="text-[13px] font-semibold uppercase text-[#6B7280]">
                Доп. поля
              </TableHead>
            )}
            {(isOwner || currentUserId || guestSessionId) && (
              <TableHead className="w-24 text-right text-[13px] font-semibold uppercase text-[#6B7280]">
                Действия
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimisticParticipants.map((participant, index) => {
            const canEdit =
              isOwner ||
              participant.userId === currentUserId ||
              participant.guestSessionId === guestSessionId;

            return (
              <TableRow
                key={participant.id}
                className="border-b border-[#E5E7EB] last:border-0 hover:bg-[#F9FAFB]/50 transition-colors"
              >
                {/* Номер */}
                <TableCell className="text-center">
                  <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-full bg-[#FF6F2C]/10 text-[#FF6F2C] text-sm font-semibold">
                    {index + 1}
                  </div>
                </TableCell>

                {/* Экипаж */}
                <TableCell>
                  {participant.userId ? (
                    <Link
                      href={`/profile/${participant.userId}`}
                      className="font-medium text-[#111827] hover:text-[var(--color-primary)] hover:underline"
                    >
                      {participant.displayName}
                    </Link>
                  ) : (
                    <span className="font-medium text-[#111827]">
                      {participant.displayName}
                    </span>
                  )}
                </TableCell>

                {/* Роль */}
                <TableCell>
                  <div className="text-[14px] text-[#374151]">
                    {formatParticipantRole(participant.role)}
                  </div>
                </TableCell>

                {/* Доп. поля */}
                {sortedCustomFields.length > 0 && (
                  <TableCell>
                    <div className="space-y-1 text-[14px] text-[#374151]">
                      {sortedCustomFields.map((field) => {
                        const value = participant.customFieldValues?.[field.id];
                        if (!value) return null;
                        return (
                          <div key={field.id}>
                            <span className="text-[#6B7280]">
                              {field.label}:{" "}
                            </span>
                            <span className="font-medium">
                              {formatCustomFieldValue(value, field.type)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </TableCell>
                )}

                {/* Действия */}
                {(isOwner || currentUserId || guestSessionId) && (
                  <TableCell className="text-right">
                    {canEdit && (
                      <ParticipantActions
                        eventId={event.id}
                        participantId={participant.id}
                        canEdit={canEdit}
                        canRemove={canEdit}
                        isOwner={isOwner}
                        authMissing={false}
                        customFieldsSchema={event.customFieldsSchema}
                        participantData={{
                          displayName: participant.displayName,
                          role: participant.role,
                          customFieldValues: participant.customFieldValues,
                        }}
                        event={event}
                        onDeleteSuccess={() => handleDeleteParticipant(participant.id)}
                        onEditSuccess={handleEditSuccess}
                      />
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
