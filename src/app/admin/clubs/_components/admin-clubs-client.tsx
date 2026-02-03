/**
 * Admin Clubs List Client
 * 
 * Client component for clubs list with search and pagination.
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0 §2):
 * - READ: GET /api/admin/clubs
 * - Allowed: Search + pagination, Navigation to club details
 * - Forbidden: plan changes, subscription activation/cancellation
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §2
 * @see SSOT_UI_STATES.md (loading, ready, error, empty)
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, ChevronRight, AlertCircle, Building2, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { listClubs, type AdminClub, type Pagination, type AdminApiError } from "../../_components/admin-api";
import { formatDateTime } from "@/lib/utils/dates";

/**
 * Page states per SSOT_UI_STATES.md
 * Note: forbidden state is handled by global admin gate (layout.tsx)
 * Admin pages assume admin access is already granted.
 */
type PageState = "loading" | "ready" | "error" | "empty";

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

export function AdminClubsClient() {
  const [state, setState] = useState<PageState>("loading");
  const [clubs, setClubs] = useState<AdminClub[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  
  /**
   * Fetch clubs from API
   * Auth is handled by global admin gate (layout.tsx)
   */
  const fetchClubs = useCallback(async (cursor?: string) => {
    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setState("loading");
    }
    setError(null);
    
    const result = await listClubs({
      q: searchQuery || undefined,
      limit: 50,
      cursor,
    });
    
    if (result.success) {
      if (cursor) {
        setClubs((prev) => [...prev, ...result.data.clubs]);
      } else {
        setClubs(result.data.clubs);
      }
      setPagination(result.data.pagination);
      setState(result.data.clubs.length === 0 && !cursor ? "empty" : "ready");
    } else {
      // All errors (including 401/403) treated as generic error
      // Auth is handled by global admin gate (layout.tsx)
      setError(result.error);
      setState("error");
    }
    
    setIsLoadingMore(false);
  }, [searchQuery]);
  
  // Initial fetch
  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);
  
  /**
   * Handle search submit
   */
  const handleSearch = () => {
    setSearchQuery(searchInput);
  };
  
  /**
   * Handle load more
   */
  const handleLoadMore = () => {
    if (pagination?.nextCursor) {
      fetchClubs(pagination.nextCursor);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Клубы</h1>
        <p className="text-gray-500 mt-1">
          Поиск клубов и просмотр подписок
        </p>
      </div>
      
      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Поиск по названию..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} variant="secondary">
          Найти
        </Button>
      </div>
      
      {/* Content */}
      {state === "loading" && (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      )}
      
      {/* Error State */}
      {state === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Ошибка</p>
            <p className="text-sm text-red-700">{error?.message}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => fetchClubs()}
              className="mt-2 text-red-700 hover:text-red-800"
            >
              Попробовать снова
            </Button>
          </div>
        </div>
      )}
      
      {state === "empty" && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchQuery ? "Ничего не найдено" : "Пока нет клубов"}
          </p>
        </div>
      )}
      
      {state === "ready" && (
        <>
          {/* Clubs List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    Клуб
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden md:table-cell">
                    План
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden sm:table-cell">
                    Статус
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 hidden lg:table-cell">
                    Истекает
                  </th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clubs.map((club) => (
                  <tr key={club.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {club.name}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {club.id.slice(0, 8)}...
                          </p>
                        </div>
                        {club.isArchived && (
                          <Badge variant="secondary" className="text-xs">
                            <Archive className="h-3 w-3 mr-1" />
                            Архив
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600">
                        {club.subscription?.planId || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={getStatusVariant(club.subscription?.status)}>
                        {getStatusLabel(club.subscription?.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-500">
                        {club.subscription?.expiresAt 
                          ? formatDateTime(club.subscription.expiresAt) 
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clubs/${club.id}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            Показано: {clubs.length}
            {pagination?.hasMore && "+"}
          </p>
        </>
      )}
    </div>
  );
}
