/**
 * Admin API Client
 * 
 * Client-side API helpers for Admin UI.
 * 
 * SECURITY (ADR-001, ADR-001.5):
 * - UI is NOT a security authority
 * - UI MUST NOT own or inject secrets
 * - Auth is handled entirely server-side
 * - UI reacts ONLY to HTTP status codes
 * 
 * @see SSOT_API.md v1.8.0 (Admin API endpoints)
 * @see SSOT_ADMIN_DOMAIN v1.0
 * @see ADMIN_UI_CONTRACT v1.0
 */

// ============================================================================
// Error Types (SSOT_UI_STATES.md compliant)
// ============================================================================

/**
 * Admin API error codes
 */
export type AdminApiErrorCode = 
  | "UNAUTHORIZED"      // 401 - not authenticated
  | "FORBIDDEN"         // 403 - authenticated but not admin
  | "NOT_FOUND"         // 404 - resource not found
  | "VALIDATION_ERROR"  // 400 - invalid input
  | "SERVER_ERROR";     // 500+ - server error

/**
 * Admin API error response
 */
export interface AdminApiError {
  code: AdminApiErrorCode;
  message: string;
  statusCode: number;
}

/**
 * Result type for API calls
 */
export type AdminApiResult<T> = 
  | { success: true; data: T }
  | { success: false; error: AdminApiError };

// ============================================================================
// Base Fetch (No Auth Headers - Server Handles Auth)
// ============================================================================

/**
 * Map HTTP status to error code
 */
function mapStatusToErrorCode(status: number): AdminApiErrorCode {
  switch (status) {
    case 401: return "UNAUTHORIZED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 400: return "VALIDATION_ERROR";
    default: return "SERVER_ERROR";
  }
}

/**
 * Base fetch for admin API
 * 
 * SECURITY:
 * - No custom auth headers injected
 * - Uses credentials: 'include' for server-managed auth
 * - Relies entirely on server-side authentication
 */
async function adminFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<AdminApiResult<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    
    // Handle auth errors explicitly
    if (response.status === 401) {
      return {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You are not authorized to access Admin UI.",
          statusCode: 401,
        },
      };
    }
    
    if (response.status === 403) {
      return {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You are not authorized to access Admin UI.",
          statusCode: 403,
        },
      };
    }
    
    // Parse response
    const data = await response.json();
    
    // Handle non-ok responses
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: mapStatusToErrorCode(response.status),
          message: data.error?.message || "An error occurred",
          statusCode: response.status,
        },
      };
    }
    
    // Success case
    if (data.success === false) {
      return {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: data.error?.message || "An error occurred",
          statusCode: response.status,
        },
      };
    }
    
    return { success: true, data: data.data ?? data };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: err instanceof Error ? err.message : "Network error",
        statusCode: 0,
      },
    };
  }
}

// ============================================================================
// Types
// ============================================================================

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  telegramHandle: string | null;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface AdminUserDetail {
  user: AdminUser;
  billing: {
    availableCreditsCount: number;
    credits: AdminCredit[];
    transactions: AdminTransaction[];
  };
}

export interface AdminCredit {
  id: string;
  creditCode: string;
  status: "available" | "consumed";
  source: "user" | "admin" | "system";
  consumedEventId: string | null;
  consumedAt: string | null;
  createdAt: string;
}

export interface AdminTransaction {
  id: string;
  productCode: string;
  provider: string;
  amount: number;
  currencyCode: string;
  status: string;
  createdAt: string;
}

export interface AdminClub {
  id: string;
  name: string;
  ownerUserId: string;
  isArchived: boolean;
  createdAt: string;
  subscription: {
    planId: string;
    status: string;
    expiresAt: string | null;
  } | null;
}

export interface AdminClubDetail {
  club: {
    id: string;
    name: string;
    ownerUserId: string;
    isArchived: boolean;
    createdAt: string;
  };
  subscription: {
    planId: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    graceUntil: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  planLimits: {
    planId: string;
    title: string;
    maxMembers: number | null;
    maxEventParticipants: number | null;
    allowPaidEvents: boolean;
    allowCsvExport: boolean;
  } | null;
  auditRecords: AdminAuditRecord[];
}

export interface AdminAuditRecord {
  id: number;
  actorType: string;
  actorId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  reason: string;
  result: "success" | "rejected";
  metadata: Record<string, unknown> | null;
  relatedEntityId: string | null;
  errorCode: string | null;
  createdAt: string;
}

export interface Pagination {
  hasMore: boolean;
  nextCursor: string | null;
  count: number;
}

// ============================================================================
// Users API
// ============================================================================

/**
 * List users with optional search
 * @see API-059 GET /api/admin/users
 */
export async function listUsers(params?: { 
  q?: string; 
  limit?: number; 
  cursor?: string;
}): Promise<AdminApiResult<{ users: AdminUser[]; pagination: Pagination }>> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", params.q);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  
  const url = `/api/admin/users${searchParams.toString() ? `?${searchParams}` : ""}`;
  return adminFetch<{ users: AdminUser[]; pagination: Pagination }>(url);
}

/**
 * Get user detail
 * @see API-060 GET /api/admin/users/:userId
 */
export async function getUserDetail(userId: string): Promise<AdminApiResult<AdminUserDetail>> {
  return adminFetch<AdminUserDetail>(`/api/admin/users/${userId}`);
}

/**
 * Grant credit to user
 * @see API-061 POST /api/admin/users/:userId/grant-credit
 */
export async function grantCredit(
  userId: string,
  creditCode: string,
  reason: string
): Promise<AdminApiResult<{ credit: AdminCredit; auditId: number }>> {
  return adminFetch<{ credit: AdminCredit; auditId: number }>(
    `/api/admin/users/${userId}/grant-credit`,
    {
      method: "POST",
      body: JSON.stringify({ creditCode, reason }),
    }
  );
}

/**
 * Change user account status (suspend / unsuspend)
 * @see API-068 POST /api/admin/users/:userId/status
 */
export async function changeUserStatus(
  userId: string,
  status: 'active' | 'suspended',
  reason: string
): Promise<AdminApiResult<{ previousStatus: string; newStatus: string; changed: boolean; auditId?: number }>> {
  return adminFetch<{ previousStatus: string; newStatus: string; changed: boolean; auditId?: number }>(
    `/api/admin/users/${userId}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status, reason }),
    }
  );
}

// ============================================================================
// Clubs API
// ============================================================================

/**
 * List clubs with optional search
 * @see API-062 GET /api/admin/clubs
 */
export async function listClubs(params?: { 
  q?: string; 
  limit?: number; 
  cursor?: string;
}): Promise<AdminApiResult<{ clubs: AdminClub[]; pagination: Pagination }>> {
  const searchParams = new URLSearchParams();
  if (params?.q) searchParams.set("q", params.q);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  
  const url = `/api/admin/clubs${searchParams.toString() ? `?${searchParams}` : ""}`;
  return adminFetch<{ clubs: AdminClub[]; pagination: Pagination }>(url);
}

/**
 * Get club detail
 * @see API-063 GET /api/admin/clubs/:clubId
 */
export async function getClubDetail(clubId: string): Promise<AdminApiResult<AdminClubDetail>> {
  return adminFetch<AdminClubDetail>(`/api/admin/clubs/${clubId}`);
}

/**
 * Extend subscription
 * @see API-064 POST /api/admin/clubs/:clubId/extend-subscription
 */
export async function extendSubscription(
  clubId: string,
  days: number,
  reason: string
): Promise<AdminApiResult<{ subscription: unknown; previousExpiresAt: string; newExpiresAt: string; auditId: number }>> {
  return adminFetch<{ 
    subscription: unknown; 
    previousExpiresAt: string; 
    newExpiresAt: string; 
    auditId: number;
  }>(
    `/api/admin/clubs/${clubId}/extend-subscription`,
    {
      method: "POST",
      body: JSON.stringify({ days, reason }),
    }
  );
}

// ============================================================================
// Audit API
// ============================================================================

/**
 * List audit records
 * @see API-065 GET /api/admin/audit
 */
export async function listAuditRecords(params?: {
  actionType?: string;
  targetType?: string;
  targetId?: string;
  actorId?: string;
  result?: "success" | "rejected";
  limit?: number;
  cursor?: string;
}): Promise<AdminApiResult<{ records: AdminAuditRecord[]; pagination: Pagination }>> {
  const searchParams = new URLSearchParams();
  if (params?.actionType) searchParams.set("actionType", params.actionType);
  if (params?.targetType) searchParams.set("targetType", params.targetType);
  if (params?.targetId) searchParams.set("targetId", params.targetId);
  if (params?.actorId) searchParams.set("actorId", params.actorId);
  if (params?.result) searchParams.set("result", params.result);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);
  
  const url = `/api/admin/audit${searchParams.toString() ? `?${searchParams}` : ""}`;
  return adminFetch<{ records: AdminAuditRecord[]; pagination: Pagination }>(url);
}
