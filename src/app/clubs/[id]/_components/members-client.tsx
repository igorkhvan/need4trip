"use client";

/**
 * ClubMembersClient Component
 * 
 * Client компонент для управления участниками клуба с optimistic UI.
 * Обрабатывает удаление и изменение ролей с мгновенным feedback.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";
import { useSimpleOptimistic } from "@/hooks/use-optimistic-state";
import { ClubMembersList } from "@/components/clubs/club-members-list";
import type { ClubMemberWithUser, ClubRole } from "@/lib/types/club";

interface ClubMembersClientProps {
  clubId: string;
  initialMembers: ClubMemberWithUser[];
  canManage: boolean;
  currentUserId?: string;
}

export function ClubMembersClient({
  clubId,
  initialMembers,
  canManage,
  currentUserId,
}: ClubMembersClientProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);

  // Optimistic state for members
  const { optimisticState: optimisticMembers, setOptimistic: setOptimisticMembers } = 
    useSimpleOptimistic<ClubMemberWithUser[]>(members);

  // Sync optimistic state with actual state
  useEffect(() => {
    setOptimisticMembers(members);
  }, [members, setOptimisticMembers]);

  // Update members when initialMembers change (from server refresh)
  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  const handleRemoveMember = async (userId: string) => {
    // Optimistic update: remove member immediately
    const previousMembers = [...members];
    setOptimisticMembers(optimisticMembers.filter(m => m.userId !== userId));

    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Rollback on error
        setOptimisticMembers(previousMembers);
        
        const errorData = await res.json().catch(() => ({}));
        toast({
          title: "Ошибка",
          description: errorData?.message || "Не удалось удалить участника",
        });
        return;
      }

      // Update real state
      setMembers(prev => prev.filter(m => m.userId !== userId));
      toast({
        title: "Удалено",
        description: "Участник удалён из клуба",
      });

      // Refresh to get updated counts
      router.refresh();
    } catch (error) {
      // Rollback on error
      setOptimisticMembers(previousMembers);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Произошла ошибка",
      });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: ClubRole) => {
    // Optimistic update: update role immediately
    const previousMembers = [...members];
    setOptimisticMembers(
      optimisticMembers.map(m => 
        m.userId === userId ? { ...m, role: newRole } : m
      )
    );

    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        // Rollback on error
        setOptimisticMembers(previousMembers);
        
        const errorData = await res.json().catch(() => ({}));
        toast({
          title: "Ошибка",
          description: errorData?.message || "Не удалось изменить роль",
        });
        return;
      }

      // Update real state
      setMembers(prev =>
        prev.map(m => (m.userId === userId ? { ...m, role: newRole } : m))
      );
      toast({
        title: "Обновлено",
        description: "Роль участника изменена",
      });

      // Refresh to ensure consistency
      router.refresh();
    } catch (error) {
      // Rollback on error
      setOptimisticMembers(previousMembers);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Произошла ошибка",
      });
    }
  };

  return (
    <ClubMembersList
      clubId={clubId}
      members={optimisticMembers}
      canManage={canManage}
      currentUserId={currentUserId}
      onRemoveMember={handleRemoveMember}
      onUpdateRole={handleUpdateRole}
    />
  );
}
