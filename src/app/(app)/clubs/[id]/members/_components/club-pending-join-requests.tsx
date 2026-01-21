/**
 * ClubPendingJoinRequests Component
 * 
 * Pending join requests section for Club Members page.
 * Per Visual Contract v5 §3: Dedicated section inside Members page.
 * Data source: GET /api/clubs/[id]/join-requests (API-054)
 * 
 * Visibility: Owner OR Admin (per V5 §4)
 * 
 * Content per row (V5 §7):
 * - User avatar
 * - User display name
 * - Request creation date
 * - NO additional metadata (messages forbidden per V5 §10)
 * 
 * Actions (Owner/Admin - per V5 §8):
 * - Approve (API-055): Primary style, user becomes member, row removed
 * - Reject (API-056): Destructive secondary style, row removed
 * 
 * Interaction rules:
 * - No optimistic UI
 * - Per-row loading state
 * - On success: explicit refetch required
 * 
 * Error → UI Mapping (V5 §9):
 * - 401: Redirect to login
 * - 403 (archived): Disable actions + archived hint
 * - 404: Remove row + refetch
 * - 409: Inline message + refetch
 * 
 * Archived Club Rules (V5 §11):
 * - Both buttons disabled
 * - Inline hint: "Club is archived. Membership changes are disabled."
 */

"use client";

import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2, AlertCircle } from "lucide-react";
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
        // Per V5 §9: 404 = remove row + refetch
        if (response.status === 404) {
          onRequestProcessed?.();
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
        // Per V5 §9: 404 = remove row + refetch
        if (response.status === 404) {
          onRequestProcessed?.();
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

  // Per Visual Contract V5 §6 States: Empty
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">
          Заявки на вступление
        </h2>
        {/* Per V5 §6: Empty state placeholder */}
        <p className="text-center text-muted-foreground py-8">
          Нет ожидающих заявок на вступление
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
      
      {/* Archived hint - per V5 §11 */}
      {isArchived && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-[var(--color-bg-subtle)] p-3 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Клуб в архиве. Управление участниками недоступно.</span>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger)]">
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

              {/* Info - per V5 §7: only name + date, NO messages */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--color-text)] truncate">
                  {request.user?.name || "Пользователь"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Заявка от {formatDate(request.createdAt)}
                </p>
              </div>

              {/* Actions - per V5 §8: Approve=Primary, Reject=Destructive(secondary) */}
              <div className="flex items-center gap-2">
                {/* Approve button - Primary style per V5 §8 */}
                <Button
                  variant="default"
                  size="sm"
                  disabled={isArchived || isProcessing}
                  onClick={() => handleApprove(request.id)}
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>Одобрить</span>
                </Button>

                {/* Reject button - Destructive (secondary) per V5 §8 */}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isArchived || isProcessing}
                  onClick={() => handleReject(request.id)}
                  className="border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                >
                  {isRejecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <span>Отклонить</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
