/**
 * Admin Audit Log Client
 * 
 * Client component for audit log with filtering.
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0 §2):
 * - READ: GET /api/admin/audit
 * - Allowed: Filters (by actor, action, target), View audit details
 * - Forbidden: editing, deleting, replaying actions, export
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §2
 * @see SSOT_UI_STATES.md (loading, ready, error, empty)
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertCircle, ScrollText, Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { listAuditRecords, type AdminAuditRecord, type Pagination, type AdminApiError } from "../../_components/admin-api";
import { formatDateTime } from "@/lib/utils/dates";

/**
 * Page states per SSOT_UI_STATES.md
 * - forbidden: 401/403 auth error (distinct from generic error)
 */
type PageState = "loading" | "ready" | "error" | "empty" | "forbidden";

interface Filters {
  targetType: string | null;
  result: "success" | "rejected" | null;
}

export function AdminAuditClient() {
  const [state, setState] = useState<PageState>("loading");
  const [records, setRecords] = useState<AdminAuditRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<Filters>({ targetType: null, result: null });
  const [showFilters, setShowFilters] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  /**
   * Fetch audit records from API
   * Handles auth errors (401/403) per SSOT_UI_STATES.md §5 (Forbidden State)
   */
  const fetchRecords = useCallback(async (cursor?: string) => {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setState("loading");
    }
    setError(null);
    
    const result = await listAuditRecords({
      targetType: filters.targetType || undefined,
      result: filters.result || undefined,
      limit: 100,
      cursor,
    });
    
    if (result.success) {
      if (cursor) {
        setRecords((prev) => [...prev, ...result.data.records]);
      } else {
        setRecords(result.data.records);
      }
      setPagination(result.data.pagination);
      setState(result.data.records.length === 0 && !cursor ? "empty" : "ready");
    } else {
      // Handle auth errors distinctly (SSOT_UI_STATES.md §5)
      if (result.error.code === "UNAUTHORIZED" || result.error.code === "FORBIDDEN") {
        setError(result.error);
        setState("forbidden");
      } else {
        setError(result.error);
        setState("error");
      }
    }
    
    setIsLoadingMore(false);
  }, [filters]);
  
  // Initial fetch
  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);
  
  /**
   * Handle filter change
   */
  const handleFilterChange = (key: keyof Filters, value: string | null) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  
  /**
   * Handle load more
   */
  const handleLoadMore = () => {
    if (pagination?.nextCursor) {
      fetchRecords(pagination.nextCursor);
    }
  };
  
  /**
   * Toggle record expansion
   */
  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Журнал действий</h1>
        <p className="text-gray-500 mt-1">
          История admin-операций
        </p>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700"
        >
          <Filter className="h-4 w-4" />
          Фильтры
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
        
        {showFilters && (
          <div className="mt-4 flex flex-wrap gap-4">
            {/* Target Type Filter */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Тип объекта</label>
              <select
                value={filters.targetType || ""}
                onChange={(e) => handleFilterChange("targetType", e.target.value || null)}
                className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="">Все</option>
                <option value="user">Пользователь</option>
                <option value="club">Клуб</option>
              </select>
            </div>
            
            {/* Result Filter */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Результат</label>
              <select
                value={filters.result || ""}
                onChange={(e) => handleFilterChange("result", e.target.value || null)}
                className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="">Все</option>
                <option value="success">Успешно</option>
                <option value="rejected">Отклонено</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
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
              onClick={() => fetchRecords()}
              className="mt-2 text-red-700 hover:text-red-800"
            >
              Попробовать снова
            </Button>
          </div>
        </div>
      )}
      
      {state === "empty" && (
        <div className="text-center py-12">
          <ScrollText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Пока нет записей</p>
        </div>
      )}
      
      {state === "ready" && (
        <>
          {/* Audit Records List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {records.map((record) => (
                <div key={record.id} className="hover:bg-gray-50 transition-colors">
                  {/* Record Header */}
                  <button
                    onClick={() => toggleExpand(record.id)}
                    className="w-full px-4 py-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-gray-900">
                          {record.actionType}
                        </span>
                        <span className="text-xs text-gray-500 mt-0.5">
                          {formatDateTime(record.createdAt)} • {record.targetType}: {record.targetId.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge 
                        variant={record.result === "success" ? "success" : "danger"}
                      >
                        {record.result === "success" ? "Успешно" : "Отклонено"}
                      </Badge>
                      <ChevronDown 
                        className={`h-4 w-4 text-gray-400 transition-transform ${
                          expandedId === record.id ? "rotate-180" : ""
                        }`} 
                      />
                    </div>
                  </button>
                  
                  {/* Expanded Details */}
                  {expandedId === record.id && (
                    <div className="px-4 pb-4">
                      <dl className="grid gap-3 sm:grid-cols-2 text-sm bg-gray-50 rounded-lg p-4">
                        <div>
                          <dt className="text-gray-500">ID записи</dt>
                          <dd className="font-mono text-gray-900">{record.id}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Актор</dt>
                          <dd className="font-mono text-gray-900">
                            {record.actorType}: {record.actorId}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Действие</dt>
                          <dd className="text-gray-900">{record.actionType}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Цель</dt>
                          <dd className="font-mono text-gray-900">
                            {record.targetType}: {record.targetId}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-gray-500">Причина</dt>
                          <dd className="text-gray-900">{record.reason}</dd>
                        </div>
                        {record.relatedEntityId && (
                          <div>
                            <dt className="text-gray-500">Связанная сущность</dt>
                            <dd className="font-mono text-gray-900">{record.relatedEntityId}</dd>
                          </div>
                        )}
                        {record.errorCode && (
                          <div>
                            <dt className="text-gray-500">Код ошибки</dt>
                            <dd className="text-red-600">{record.errorCode}</dd>
                          </div>
                        )}
                        {record.metadata && Object.keys(record.metadata).length > 0 && (
                          <div className="sm:col-span-2">
                            <dt className="text-gray-500 mb-1">Метаданные</dt>
                            <dd className="font-mono text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(record.metadata, null, 2)}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Pagination */}
          {pagination?.hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Загрузка...
                  </>
                ) : (
                  "Загрузить ещё"
                )}
              </Button>
            </div>
          )}
          
          {/* Count */}
          <p className="text-sm text-gray-500 text-center">
            Показано: {records.length}
            {pagination?.hasMore && "+"}
          </p>
        </>
      )}
    </div>
  );
}
