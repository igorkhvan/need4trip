/**
 * Admin User Detail Client
 * 
 * User billing detail with Grant Credit action.
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0 §2, §3.1):
 * - READ: GET /api/admin/users/:userId
 * - WRITE: POST /api/admin/users/:userId/grant-credit
 * - Write action MUST: require reason, require explicit confirmation,
 *   disable submit while loading, show explicit success/error state
 * - Forbidden: auto-submit, optimistic update, inline submit
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §2, §3.1
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.3, §3.1
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  CreditCard,
  Plus,
  Calendar,
  Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { 
  getUserDetail, 
  type AdminUserDetail,
  type AdminApiError,
} from "../../../_components/admin-api";
import { formatDateTime } from "@/lib/utils/dates";
import { GrantCreditModal } from "./grant-credit-modal";

/**
 * Page states per SSOT_UI_STATES.md
 * - forbidden: 401/403 auth error (distinct from generic error)
 */
type PageState = "loading" | "ready" | "error" | "notfound" | "forbidden";

interface AdminUserDetailClientProps {
  userId: string;
}

export function AdminUserDetailClient({ userId }: AdminUserDetailClientProps) {
  const [state, setState] = useState<PageState>("loading");
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  
  /**
   * Fetch user detail
   * Handles auth errors (401/403) per SSOT_UI_STATES.md §5 (Forbidden State)
   */
  const fetchData = useCallback(async () => {
    setState("loading");
    setError(null);
    
    const result = await getUserDetail(userId);
    
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
  }, [userId]);
  
  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  /**
   * Handle grant credit success
   */
  const handleGrantSuccess = () => {
    // Refetch data to show new credit
    fetchData();
  };
  
  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        К списку пользователей
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
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Пользователь не найден</p>
          <p className="text-sm text-gray-500 mt-1">
            Проверьте ID пользователя
          </p>
        </div>
      )}
      
      {/* Ready State */}
      {state === "ready" && data && (
        <>
          {/* Page Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {data.user.name || "Пользователь"}
              </h1>
              <p className="text-gray-500 mt-1">
                {data.user.email || data.user.telegramHandle ? `@${data.user.telegramHandle}` : "—"}
              </p>
            </div>
            
            {/* 
              Grant Credit Action 
              SYSTEM CONTRACT §3.1: explicit CTA button
            */}
            <Button onClick={() => setShowGrantModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Выдать кредит
            </Button>
          </div>
          
          {/* User Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Информация
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <dt className="text-sm text-gray-500">ID</dt>
                <dd className="text-sm font-mono text-gray-900 mt-1 truncate">
                  {data.user.id}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {data.user.email || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Telegram</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {data.user.telegramHandle ? `@${data.user.telegramHandle}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Регистрация</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {formatDateTime(data.user.createdAt)}
                </dd>
              </div>
            </dl>
          </div>
          
          {/* Billing Credits Section */}
          {/* READ SURFACE - clearly separated from write actions */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-gray-400" />
                <h2 className="font-medium text-gray-900">Биллинг-кредиты</h2>
              </div>
              <Badge variant={data.billing.availableCreditsCount > 0 ? "default" : "secondary"}>
                Доступно: {data.billing.availableCreditsCount}
              </Badge>
            </div>
            
            {data.billing.credits.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500">Пока нет кредитов</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.billing.credits.map((credit) => (
                  <div key={credit.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {credit.creditCode}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(credit.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={credit.source === "admin" ? "outline" : "secondary"}
                        className="text-xs"
                      >
                        {credit.source === "admin" ? "Admin" : credit.source}
                      </Badge>
                      <Badge 
                        variant={credit.status === "available" ? "default" : "secondary"}
                      >
                        {credit.status === "available" ? "Доступен" : "Использован"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Transactions Section */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
              <Hash className="h-5 w-5 text-gray-400" />
              <h2 className="font-medium text-gray-900">Транзакции</h2>
            </div>
            
            {data.billing.transactions.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500">Пока нет транзакций</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.billing.transactions.map((tx) => (
                  <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {tx.productCode}
                      </span>
                      <span className="text-xs text-gray-500 mt-0.5">
                        {tx.provider} • {formatDateTime(tx.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">
                        {tx.amount.toLocaleString()} {tx.currencyCode}
                      </span>
                      <Badge 
                        variant={tx.status === "paid" ? "default" : "secondary"}
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Grant Credit Modal */}
          <GrantCreditModal
            userId={userId}
            userName={data.user.name || data.user.email || "Пользователь"}
            open={showGrantModal}
            onOpenChange={setShowGrantModal}
            onSuccess={handleGrantSuccess}
          />
        </>
      )}
    </div>
  );
}
