/**
 * Admin API: Audit Log
 * 
 * List admin audit records with filtering.
 * READ-ONLY - no mutations.
 * 
 * @see SSOT_ADMIN_AUDIT_RULES v1.0 §6 (Read Access to Audit Logs)
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.6 (Admin Audit Log)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveAdminContext } from "@/lib/auth/resolveAdminContext";
import { getAdminDb } from "@/lib/db/client";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/audit
 * 
 * Query params:
 * - actionType: filter by action type (optional)
 * - targetType: filter by target type (user|club) (optional)
 * - targetId: filter by target ID (optional)
 * - actorId: filter by actor ID (optional)
 * - result: filter by result (success|rejected) (optional)
 * - limit: max records (default 100, max 500)
 * - cursor: pagination cursor (optional, audit record id to start after)
 * 
 * Returns: list of audit records, newest first
 */
export async function GET(request: NextRequest) {
  // =========================================================================
  // 1. Resolve Admin Context (MANDATORY)
  // =========================================================================
  const adminContext = resolveAdminContext(request);
  
  if (!adminContext) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Invalid admin credentials",
        },
      },
      { status: 403 }
    );
  }
  
  // =========================================================================
  // 2. Parse query params
  // =========================================================================
  const { searchParams } = new URL(request.url);
  const actionType = searchParams.get("actionType") || null;
  const targetType = searchParams.get("targetType") || null;
  const targetId = searchParams.get("targetId") || null;
  const actorId = searchParams.get("actorId") || null;
  const result = searchParams.get("result") || null;
  const limitParam = searchParams.get("limit");
  const cursor = searchParams.get("cursor") || null;
  
  // Validate limit
  let limit = 100;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "limit must be a positive integer",
          },
        },
        { status: 400 }
      );
    }
    limit = Math.min(parsed, 500);
  }
  
  // Validate targetType if provided
  if (targetType && !["user", "club"].includes(targetType)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "targetType must be 'user' or 'club'",
        },
      },
      { status: 400 }
    );
  }
  
  // Validate result if provided
  if (result && !["success", "rejected"].includes(result)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "result must be 'success' or 'rejected'",
        },
      },
      { status: 400 }
    );
  }
  
  // =========================================================================
  // 3. Query audit records
  // =========================================================================
  try {
    const db = getAdminDb();
    
    let query = db
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    
    // Apply filters
    if (actionType) {
      query = query.eq("action_type", actionType);
    }
    if (targetType) {
      query = query.eq("target_type", targetType);
    }
    if (targetId) {
      query = query.eq("target_id", targetId);
    }
    if (actorId) {
      query = query.eq("actor_id", actorId);
    }
    if (result) {
      query = query.eq("result", result as "success" | "rejected");
    }
    
    // Cursor pagination
    if (cursor) {
      const cursorId = parseInt(cursor, 10);
      if (!isNaN(cursorId)) {
        const { data: cursorRecord } = await db
          .from("admin_audit_log")
          .select("created_at")
          .eq("id", cursorId)
          .single();
        
        if (cursorRecord) {
          query = query.lt("created_at", cursorRecord.created_at);
        }
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      log.error("[Admin/Audit] Query failed", { error, filters: { actionType, targetType, targetId, actorId, result } });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch audit records",
          },
        },
        { status: 500 }
      );
    }
    
    // Check if there are more records
    const hasMore = (data?.length ?? 0) > limit;
    const records = (data ?? []).slice(0, limit);
    
    // Map to response format
    const mappedRecords = records.map((r: any) => ({
      id: r.id,
      actorType: r.actor_type,
      actorId: r.actor_id,
      actionType: r.action_type,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      result: r.result,
      metadata: r.metadata,
      relatedEntityId: r.related_entity_id,
      errorCode: r.error_code,
      createdAt: r.created_at,
    }));
    
    // Next cursor
    const nextCursor = hasMore && records.length > 0 
      ? String(records[records.length - 1].id) 
      : null;
    
    return NextResponse.json({
      success: true,
      data: {
        records: mappedRecords,
        pagination: {
          hasMore,
          nextCursor,
          count: mappedRecords.length,
        },
      },
    });
  } catch (err) {
    log.error("[Admin/Audit] Unexpected error", { error: err });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    );
  }
}
