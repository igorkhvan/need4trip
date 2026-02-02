/**
 * Admin API: Users List
 * 
 * List users with optional search by email.
 * READ-ONLY - no mutations.
 * 
 * @see SSOT_ADMIN_DOMAIN v1.0 §4.1 (User Context Read-Only)
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.2 (Users — Billing View)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveAdminContext } from "@/lib/auth/resolveAdminContext";
import { getAdminDb } from "@/lib/db/client";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users
 * 
 * Query params:
 * - q: email substring filter (optional)
 * - limit: max records (default 50, max 200)
 * - cursor: pagination cursor (optional, user id to start after)
 * 
 * Returns: list of users with minimal fields for admin list
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
  const q = searchParams.get("q")?.trim() || null;
  const limitParam = searchParams.get("limit");
  const cursor = searchParams.get("cursor") || null;
  
  // Validate limit
  let limit = 50;
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
    limit = Math.min(parsed, 200);
  }
  
  // =========================================================================
  // 3. Query users
  // =========================================================================
  try {
    const db = getAdminDb();
    
    let query = db
      .from("users")
      .select("id, name, email, telegram_handle, created_at")
      .order("created_at", { ascending: false })
      .limit(limit + 1); // Fetch one extra to determine hasMore
    
    // Filter by email if provided
    if (q) {
      query = query.ilike("email", `%${q}%`);
    }
    
    // Cursor pagination
    if (cursor) {
      // Get the created_at of cursor user
      const { data: cursorUser } = await db
        .from("users")
        .select("created_at")
        .eq("id", cursor)
        .single();
      
      if (cursorUser) {
        query = query.lt("created_at", cursorUser.created_at);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      log.error("[Admin/Users] Query failed", { error, q, limit, cursor });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch users",
          },
        },
        { status: 500 }
      );
    }
    
    // Check if there are more records
    const hasMore = (data?.length ?? 0) > limit;
    const users = (data ?? []).slice(0, limit);
    
    // Map to response format
    const mappedUsers = users.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      telegramHandle: user.telegram_handle,
      createdAt: user.created_at,
    }));
    
    // Next cursor
    const nextCursor = hasMore && users.length > 0 
      ? users[users.length - 1].id 
      : null;
    
    return NextResponse.json({
      success: true,
      data: {
        users: mappedUsers,
        pagination: {
          hasMore,
          nextCursor,
          count: mappedUsers.length,
        },
      },
    });
  } catch (err) {
    log.error("[Admin/Users] Unexpected error", { error: err });
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
