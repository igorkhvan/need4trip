/**
 * Admin API: Clubs List
 * 
 * List clubs with optional search by name.
 * READ-ONLY - no mutations.
 * 
 * @see SSOT_ADMIN_DOMAIN v1.0 §4.2 (Club Context Read-Only)
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.4 (Clubs — Subscription View)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveAdminContext } from "@/lib/auth/resolveAdminContext";
import { getAdminDb } from "@/lib/db/client";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/clubs
 * 
 * Query params:
 * - q: name substring filter (optional)
 * - limit: max records (default 50, max 200)
 * - cursor: pagination cursor (optional, club id to start after)
 * 
 * Returns: list of clubs with subscription state
 */
export async function GET(request: NextRequest) {
  // =========================================================================
  // 1. Resolve Admin Context (MANDATORY)
  // =========================================================================
  const adminContext = await resolveAdminContext(request);
  
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
  // 3. Query clubs with subscriptions
  // =========================================================================
  try {
    const db = getAdminDb();
    
    // Build base query for clubs
    let query = db
      .from("clubs")
      .select(`
        id, 
        name, 
        owner_user_id, 
        created_at,
        archived_at
      `)
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    
    // Filter by name if provided
    if (q) {
      query = query.ilike("name", `%${q}%`);
    }
    
    // Cursor pagination
    if (cursor) {
      const { data: cursorClub } = await db
        .from("clubs")
        .select("created_at")
        .eq("id", cursor)
        .single();
      
      if (cursorClub) {
        query = query.lt("created_at", cursorClub.created_at);
      }
    }
    
    const { data: clubs, error: clubsError } = await query;
    
    if (clubsError) {
      log.error("[Admin/Clubs] Query failed", { error: clubsError, q, limit, cursor });
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch clubs",
          },
        },
        { status: 500 }
      );
    }
    
    // Check if there are more records
    const hasMore = (clubs?.length ?? 0) > limit;
    const clubsList = (clubs ?? []).slice(0, limit);
    
    // Get subscriptions for these clubs
    const clubIds = clubsList.map((c: any) => c.id);
    
    let subscriptionsMap: Map<string, any> = new Map();
    if (clubIds.length > 0) {
      const { data: subscriptions } = await db
        .from("club_subscriptions")
        .select("club_id, plan_id, status, current_period_end")
        .in("club_id", clubIds);
      
      (subscriptions ?? []).forEach((sub: any) => {
        subscriptionsMap.set(sub.club_id, sub);
      });
    }
    
    // Map to response format
    const mappedClubs = clubsList.map((club: any) => {
      const sub = subscriptionsMap.get(club.id);
      return {
        id: club.id,
        name: club.name,
        ownerUserId: club.owner_user_id,
        isArchived: club.archived_at !== null,
        createdAt: club.created_at,
        subscription: sub ? {
          planId: sub.plan_id,
          status: sub.status,
          expiresAt: sub.current_period_end,
        } : null,
      };
    });
    
    // Next cursor
    const nextCursor = hasMore && clubsList.length > 0 
      ? clubsList[clubsList.length - 1].id 
      : null;
    
    return NextResponse.json({
      success: true,
      data: {
        clubs: mappedClubs,
        pagination: {
          hasMore,
          nextCursor,
          count: mappedClubs.length,
        },
      },
    });
  } catch (err) {
    log.error("[Admin/Clubs] Unexpected error", { error: err });
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
