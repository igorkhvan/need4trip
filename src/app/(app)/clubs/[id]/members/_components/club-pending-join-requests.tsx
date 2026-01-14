/**
 * ClubPendingJoinRequests Component
 * 
 * Pending join requests section for Club Members page.
 * Per Visual Contract v4 §6: Blocking render, owner only.
 * Data source: GET /api/clubs/[id]/join-requests (API-054)
 * 
 * Visibility: Owner only (entire section hidden for non-owners)
 * 
 * Content per row:
 * - User avatar
 * - User display name
 * - Request creation date
 * 
 * Actions (Owner Only):
 * - Approve (API-055): User becomes member; list refresh
 * - Reject (API-056): Request removed; list refresh
 * 
 * Interaction rules:
 * - No optimistic UI
 * - Buttons show per-item loading state
 * - On success: explicit refresh / revalidation required
 * 
 * Error → UI Mapping:
 * - 401: Redirect to login
 * - 403 (archived): Disable actions + archived hint
 * - 409 (already processed): Inline message + refresh
 */

"use client";

import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, X, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils/dates";

interface JoinRequestUser {
  id: string;
  name: string;
  telegramHandle: string | null;
  avatarUrl: string | null;
}

interface JoinRequest {
  id: string;
  clubId: string;
  requesterUserId: string;
  status: string;
  message: string | null;
  createdAt: string;
  user?: JoinRequestUser;
}

interface ClubPendingJoinRequestsProps {
  requests: JoinRequest[];
  isArchived: boolean;
  clubId: string;
  onRequestProcessed?: () => void;
}

export function ClubPendingJoinRequests({
  requests,
  isArchived,
  clubId,
  onRequestProcessed,
}: ClubPendingJoinRequestsProps) {
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (requestId: string) => {
    if (isArchived) return;
    
    setProcessingRequestId(requestId);
    setProcessingAction("approve");
    setError(null);
    
    try {
      const response = await fetch(
        `/api/clubs/${clubId}/join-requests/${requestId}/approve`,
        { method: "POST" }
      );
      
      if (!response.ok) {
        const data = await response.json();
        
        // Per Visual Contract v4 §6 Error → UI Mapping
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (response.status === 403 && isArchived) {
          setError("Клуб в архиве. Действия недоступны.");
          return;
        }
        if (response.status === 409) {
          setError("Заявка уже обработана. Обновите страницу.");
          onRequestProcessed?.();
          return;
        }
        
        throw new Error(data.error?.message || "Не удалось одобрить заявку");
      }
      
      // Success - refresh the list
      onRequestProcessed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setProcessingRequestId(null);
      setProcessingAction(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (isArchived) return;
    
    setProcessingRequestId(requestId);
    setProcessingAction("reject");
    setError(null);
    
    try {
      const response = await fetch(
        `/api/clubs/${clubId}/join-requests/${requestId}/reject`,
        { method: "POST" }
      );
      
      if (!response.ok) {
        const data = await response.json();
        
        // Per Visual Contract v4 §6 Error → UI Mapping
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (response.status === 403 && isArchived) {
          setError("Клуб в архиве. Действия недоступны.");
          return;
        }
        if (response.status === 409) {
          setError("Заявка уже обработана. Обновите страницу.");
          onRequestProcessed?.();
          return;
        }
        
        throw new Error(data.error?.message || "Не удалось отклонить заявку");
      }
      
      // Success - refresh the list
      onRequestProcessed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setProcessingRequestId(null);
      setProcessingAction(null);
    }
  };

  // Per Visual Contract v4 §6 States: Empty
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
          Заявки на вступление
        </h2>
        <p className="text-center text-muted-foreground py-8">
          Нет заявок на вступление
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">
          Заявки на вступление ({requests.length})
        </h2>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">
          {error}
        </div>
      )}
      
      <div className="space-y-3">
        {requests.map((request) => {
          const isProcessing = processingRequestId === request.id;
          const isApproving = isProcessing && processingAction === "approve";
          const isRejecting = isProcessing && processingAction === "reject";
          
          return (
            <div
              key={request.id}
              className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              {/* Avatar */}
              <Avatar className="h-12 w-12">
                {request.user?.avatarUrl && (
                  <AvatarImage 
                    src={request.user.avatarUrl} 
                    alt={request.user?.name || "User"} 
                  />
                )}
                <AvatarFallback className="bg-[var(--color-primary-bg)] text-[var(--color-primary)] font-medium">
                  {(request.user?.name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--color-text)] truncate">
                  {request.user?.name || "Пользователь"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Заявка от {formatDate(request.createdAt)}
                </p>
                {request.message && (
                  <p className="mt-1 text-sm text-muted-foreground italic truncate">
                    &quot;{request.message}&quot;
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  {/* Approve button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={isArchived || isProcessing}
                          onClick={() => handleApprove(request.id)}
                          className={`text-[#16A34A] hover:bg-[#F0FDF4] hover:text-[#16A34A] ${
                            isArchived ? "cursor-not-allowed opacity-50" : ""
                          }`}
                        >
                          {isApproving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isArchived ? <p>Клуб в архиве</p> : <p>Одобрить</p>}
                    </TooltipContent>
                  </Tooltip>

                  {/* Reject button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={isArchived || isProcessing}
                          onClick={() => handleReject(request.id)}
                          className={`text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#DC2626] ${
                            isArchived ? "cursor-not-allowed opacity-50" : ""
                          }`}
                        >
                          {isRejecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isArchived ? <p>Клуб в архиве</p> : <p>Отклонить</p>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
