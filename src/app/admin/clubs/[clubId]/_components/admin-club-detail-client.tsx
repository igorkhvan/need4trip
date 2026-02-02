/**
 * Admin Club Detail Client
 * 
 * Club subscription detail with Extend Subscription action.
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0 §2, §3.2):
 * - READ: GET /api/admin/clubs/:clubId
 * - WRITE: POST /api/admin/clubs/:clubId/extend-subscription
 * - Write action MUST: require days > 0, require reason,
 *   require explicit confirmation
 * - Forbidden: plan/state edits, activation language
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §2, §3.2
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.5, §3.2
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  AlertCircle, 
  Building2,
  Calendar,
  Clock,
  CalendarPlus,
  Shield,
  Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { 
  getClubDetail, 
  type AdminClubDetail,
  type AdminApiError,
} from "../../../_components/admin-api";
import { formatDateTime } from "@/lib/utils/dates";
import { ExtendSubscriptionModal } from "./extend-subscription-modal";

/**
 * Page states per SSOT_UI_STATES.md
 * - forbidden: 401/403 auth error (distinct from generic error)
 */
type PageState = "loading" | "ready" | "error" | "notfound" | "forbidden";

interface AdminClubDetailClientProps {
  clubId: string;
}

/**
 * Map subscription status to Russian label
 */
function getStatusLabel(status: string | undefined): string {
  switch (status) {
    case "active": return "Активна";
    case "pending": return "Ожидание";
    case "grace": return "Grace";
    case "expired": return "Истекла";
    default: return "—";
  }
}

/**
 * Get badge variant for status
 */
function getStatusVariant(status: string | undefined): "default" | "secondary" | "danger" | "outline" {
  switch (status) {
    case "active": return "default";
    case "grace": return "outline";
    case "expired": return "danger";
    default: return "secondary";
  }
}

export function AdminClubDetailClient({ clubId }: AdminClubDetailClientProps) {
  const [state, setState] = useState<PageState>("loading");
  const [data, setData] = useState<AdminClubDetail | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  
  /**
   * Fetch club detail
   * Handles auth errors (401/403) per SSOT_UI_STATES.md §5 (Forbidden State)
   */
  const fetchData = useCallback(async () => {
    setState("loading");
    setError(null);
    
    const result = await getClubDetail(clubId);
    
    if (result.success) {
      setData(result.data);
      setState("ready");
    } else {
      // Handle auth errors distinctly (SSOT_UI_STATES.md §5)
      if (result.error.code === "UNAUTHORIZED" || result.error.code === "FORBIDDEN") {
        setError(result.error);
        setState("forbidden");
      } else if (result.error.code === "NOT_FOUND") {
        setError(result.error);
        setState("notfound");
      } else {
        setError(result.error);
        setState("error");
      }
    }
  }, [clubId]);
  
  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  /**
   * Handle extend success
   */
  const handleExtendSuccess = () => {
    // Refetch data to show updated subscription
    fetchData();
  };
  
  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        href="/admin/clubs"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        К списку клубов
      </Link>
      
      {/* Loading State */}
      {state === "loading" && (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      )}
      
      {/* Forbidden State - Auth Error (SSOT_UI_STATES.md §5) */}
      {state === "forbidden" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-10 w-10 text-amber-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-amber-800">
            You are not authorized to access Admin UI.
          </p>
        </div>
      )}
      
      {/* Generic Error State */}
      {state === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Ошибка</p>
            <p className="text-sm text-red-700">{error?.message}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchData}
              className="mt-2 text-red-700 hover:text-red-800"
            >
              Попробовать снова
            </Button>
          </div>
        </div>
      )}
      
      {/* Not Found State */}
      {state === "notfound" && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Клуб не найден</p>
          <p className="text-sm text-gray-500 mt-1">
            Проверьте ID клуба
          </p>
        </div>
      )}
      
      {/* Ready State */}
      {state === "ready" && data && (
        <>
          {/* Page Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {data.club.name}
                </h1>
                {data.club.isArchived && (
                  <Badge variant="secondary">
                    <Archive className="h-3 w-3 mr-1" />
                    Архив
                  </Badge>
                )}
              </div>
              <p className="text-gray-500 mt-1 font-mono text-sm">
                {data.club.id}
              </p>
            </div>
            
            {/* 
              Extend Subscription Action 
              SYSTEM CONTRACT §3.2: explicit CTA button
              Only show if subscription exists
            */}
            {data.subscription && (
              <Button onClick={() => setShowExtendModal(true)}>
                <CalendarPlus className="h-4 w-4 mr-2" />
                Продлить подписку
              </Button>
            )}
          </div>
          
          {/* Club Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Информация о клубе
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <dt className="text-sm text-gray-500">ID</dt>
                <dd className="text-sm font-mono text-gray-900 mt-1 truncate">
                  {data.club.id}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Владелец</dt>
                <dd className="text-sm font-mono text-gray-900 mt-1 truncate">
                  {data.club.ownerUserId}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Создан</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatDateTime(data.club.createdAt)}
                </dd>
              </div>
            </dl>
          </div>
          
          {/* Subscription Section */}
          {/* READ SURFACE - clearly separated from write actions */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <h2 className="font-medium text-gray-900">Подписка</h2>
              </div>
              {data.subscription && (
                <Badge variant={getStatusVariant(data.subscription.status)}>
                  {getStatusLabel(data.subscription.status)}
                </Badge>
              )}
            </div>
            
            {!data.subscription ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500">Нет активной подписки</p>
              </div>
            ) : (
              <div className="p-6">
                <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <dt className="text-sm text-gray-500 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      План
                    </dt>
                    <dd className="text-sm font-medium text-gray-900 mt-1">
                      {data.subscription.planId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Начало периода
                    </dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      {data.subscription.currentPeriodStart 
                        ? formatDateTime(data.subscription.currentPeriodStart) 
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Конец периода
                    </dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      {data.subscription.currentPeriodEnd 
                        ? formatDateTime(data.subscription.currentPeriodEnd) 
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Grace до
                    </dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      {data.subscription.graceUntil 
                        ? formatDateTime(data.subscription.graceUntil) 
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
          
          {/* Plan Limits Section */}
          {data.planLimits && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <h2 className="font-medium text-gray-900">Лимиты плана</h2>
              </div>
              
              <div className="p-6">
                <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <dt className="text-sm text-gray-500">Макс. участников</dt>
                    <dd className="text-sm font-medium text-gray-900 mt-1">
                      {data.planLimits.maxMembers ?? "∞"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Макс. участников события</dt>
                    <dd className="text-sm font-medium text-gray-900 mt-1">
                      {data.planLimits.maxEventParticipants ?? "∞"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Платные события</dt>
                    <dd className="text-sm font-medium text-gray-900 mt-1">
                      {data.planLimits.allowPaidEvents ? "Да" : "Нет"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">CSV экспорт</dt>
                    <dd className="text-sm font-medium text-gray-900 mt-1">
                      {data.planLimits.allowCsvExport ? "Да" : "Нет"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
          
          {/* Audit Records Section */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <h2 className="font-medium text-gray-900">История admin-действий</h2>
            </div>
            
            {data.auditRecords.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500">Пока нет записей</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.auditRecords.map((record) => (
                  <div key={record.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {record.actionType}
                      </span>
                      <span className="text-xs text-gray-500 mt-0.5">
                        {formatDateTime(record.createdAt)} • {record.reason}
                      </span>
                    </div>
                    <Badge 
                      variant={record.result === "success" ? "success" : "danger"}
                    >
                      {record.result}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Extend Subscription Modal */}
          {data.subscription && (
            <ExtendSubscriptionModal
              clubId={clubId}
              clubName={data.club.name}
              currentExpiresAt={data.subscription.currentPeriodEnd}
              open={showExtendModal}
              onOpenChange={setShowExtendModal}
              onSuccess={handleExtendSuccess}
            />
          )}
        </>
      )}
    </div>
  );
}
