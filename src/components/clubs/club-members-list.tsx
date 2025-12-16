/**
 * Club Members List Component
 * 
 * Список участников клуба с управлением
 */

"use client";

import { useState } from "react";
import { Shield, Crown, Users as UsersIcon, Clock, MoreVertical, Trash2, UserCog, Download } from "lucide-react";
import type { ClubMemberWithUser, ClubRole } from "@/lib/types/club";
import { getClubRoleLabel } from "@/lib/types/club";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PaywallModal, usePaywall } from "@/components/billing/PaywallModal";

interface ClubMembersListProps {
  clubId: string;
  members: ClubMemberWithUser[];
  canManage: boolean;
  currentUserId?: string;
  onRemoveMember?: (userId: string) => Promise<void>;
  onUpdateRole?: (userId: string, newRole: ClubRole) => Promise<void>;
}

export function ClubMembersList({
  clubId,
  members,
  canManage,
  currentUserId,
  onRemoveMember,
  onUpdateRole,
}: ClubMembersListProps) {
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // ⚡ Billing v2.0: Paywall hook
  const { showPaywall, PaywallModalComponent } = usePaywall();

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/export`);
      
      if (!res.ok) {
        if (res.status === 402) {
          // ⚡ Billing v2.0: Handle paywall response
          const response = await res.json();
          // For error responses, the format is {success: false, error: {...}}
          const errorData = response.error || response;
          if (errorData.details?.code === 'PAYWALL' || errorData.code === 'PAYWALL') {
            showPaywall(errorData.details || errorData);
            return;
          }
        }
        throw new Error("Failed to export");
      }

      // Download CSV
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `club_members_${clubId}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to export:", err);
      alert("Не удалось экспортировать участников");
    } finally {
      setExporting(false);
    }
  };

  const getRoleIcon = (role: ClubRole) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-[#D97706]" />;
      case "organizer":
        return <Shield className="h-4 w-4 text-[#3B82F6]" />;
      case "member":
        return <UsersIcon className="h-4 w-4 text-[#6B7280]" />;
      case "pending":
        return <Clock className="h-4 w-4 text-[#9CA3AF]" />;
    }
  };

  const getRoleBadgeVariant = (role: ClubRole): "default" | "premium" | "secondary" => {
    switch (role) {
      case "owner":
        return "premium";
      case "organizer":
        return "default";
      default:
        return "secondary";
    }
  };

  const handleRemove = async () => {
    if (!actionUserId || !onRemoveMember) return;

    try {
      await onRemoveMember(actionUserId);
      setShowRemoveConfirm(false);
      setActionUserId(null);
    } catch (err) {
      console.error("Failed to remove member", err);
    }
  };

  const handleRoleChange = async (userId: string, newRole: ClubRole) => {
    if (!onUpdateRole) return;

    try {
      await onUpdateRole(userId, newRole);
    } catch (err) {
      console.error("Failed to update role", err);
    }
  };

  return (
    <>
      {/* Export Button */}
      {canManage && members.length > 0 && (
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Экспорт..." : "Экспортировать в CSV"}
          </Button>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.userId}
            className="flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white p-4 transition-colors hover:border-[#D1D5DB]"
          >
            {/* Аватар */}
            {member.user.avatarUrl ? (
              <img
                src={member.user.avatarUrl}
                alt={member.user.name}
                className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF6F2C] to-[#E86223] font-semibold text-white">
                {member.user.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Информация */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="truncate font-medium text-[#1F2937]">
                  {member.user.name}
                </span>
                {member.userId === currentUserId && (
                  <Badge variant="secondary" size="sm">
                    Вы
                  </Badge>
                )}
              </div>
              {member.user.telegramHandle && (
                <a
                  href={`https://t.me/${member.user.telegramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] text-[#6B7280] hover:text-[var(--color-primary)]"
                >
                  @{member.user.telegramHandle}
                </a>
              )}
            </div>

            {/* Роль */}
            <div className="flex items-center gap-2">
              {getRoleIcon(member.role)}
              <Badge variant={getRoleBadgeVariant(member.role)} size="sm">
                {getClubRoleLabel(member.role)}
              </Badge>
            </div>

            {/* Действия (только для владельца) */}
            {canManage && member.role !== "owner" && member.userId !== currentUserId && (
              <div className="relative">
                <button
                  onClick={() => setActionUserId(member.userId)}
                  className="rounded-xl p-2 text-[#9CA3AF] transition-colors hover:bg-[#F9FAFB] hover:text-[#6B7280]"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>

                {actionUserId === member.userId && (
                  <div className="absolute right-0 z-10 mt-2 w-48 rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-lg">
                    {/* Смена роли */}
                    {member.role !== "organizer" && (
                      <button
                        onClick={() => handleRoleChange(member.userId, "organizer")}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[14px] text-[#111827] hover:bg-[#F9FAFB]"
                      >
                        <UserCog className="h-4 w-4" />
                        <span>Сделать организатором</span>
                      </button>
                    )}
                    {member.role === "organizer" && (
                      <button
                        onClick={() => handleRoleChange(member.userId, "member")}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-[14px] text-[#111827] hover:bg-[#F9FAFB]"
                      >
                        <UsersIcon className="h-4 w-4" />
                        <span>Сделать участником</span>
                      </button>
                    )}
                    {/* Удаление */}
                    <button
                      onClick={() => {
                        setShowRemoveConfirm(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-[14px] text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Удалить</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="py-12 text-center text-[#6B7280]">
            <UsersIcon className="mx-auto mb-3 h-12 w-12 text-[#9CA3AF]" />
            <p>Пока нет участников</p>
          </div>
        )}
      </div>

      {/* Диалог подтверждения удаления */}
      <ConfirmDialog
        open={showRemoveConfirm}
        onClose={() => {
          setShowRemoveConfirm(false);
          setActionUserId(null);
        }}
        onConfirm={handleRemove}
        title="Удалить участника?"
        description="Участник потеряет доступ к клубу и его событиям."
        confirmText="Удалить"
      />

      {/* ⚡ Billing v2.0: Paywall Modal */}
      {PaywallModalComponent}
    </>
  );
}

