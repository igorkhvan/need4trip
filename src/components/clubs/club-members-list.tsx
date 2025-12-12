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
import { PaywallModal, usePaywall } from "@/components/ui/paywall-modal";
import { isPaywallResponse } from "@/lib/types/paywall";

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
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { paywallOpen, paywallTrigger, showPaywall, hidePaywall } = usePaywall();

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/export`);
      
      if (!res.ok) {
        if (res.status === 402) {
          // Paywall hit
          const data = await res.json();
          if (isPaywallResponse(data)) {
            showPaywall(data.paywall);
          }
          return;
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
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case "organizer":
        return <Shield className="w-4 h-4 text-blue-600" />;
      case "member":
        return <UsersIcon className="w-4 h-4 text-gray-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-gray-400" />;
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

    setLoading(true);
    try {
      await onRemoveMember(actionUserId);
      setShowRemoveConfirm(false);
      setActionUserId(null);
    } catch (err) {
      console.error("Failed to remove member", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: ClubRole) => {
    if (!onUpdateRole) return;

    setLoading(true);
    try {
      await onUpdateRole(userId, newRole);
    } catch (err) {
      console.error("Failed to update role", err);
    } finally {
      setLoading(false);
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
            className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            {/* Аватар */}
            {member.user.avatarUrl ? (
              <img
                src={member.user.avatarUrl}
                alt={member.user.name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {member.user.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Информация */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 truncate">
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
                  className="text-sm text-gray-500 hover:text-primary-600"
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
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  disabled={loading}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {actionUserId === member.userId && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    {/* Смена роли */}
                    {member.role !== "organizer" && (
                      <button
                        onClick={() => handleRoleChange(member.userId, "organizer")}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <UserCog className="w-4 h-4" />
                        Сделать организатором
                      </button>
                    )}
                    {member.role === "organizer" && (
                      <button
                        onClick={() => handleRoleChange(member.userId, "member")}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <UsersIcon className="w-4 h-4" />
                        Сделать участником
                      </button>
                    )}
                    {/* Удаление */}
                    <button
                      onClick={() => {
                        setShowRemoveConfirm(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
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
        loading={loading}
      />

      {/* Paywall Modal */}
      {paywallTrigger && (
        <PaywallModal
          open={paywallOpen}
          onOpenChange={hidePaywall}
          trigger={paywallTrigger}
        />
      )}
    </>
  );
}

