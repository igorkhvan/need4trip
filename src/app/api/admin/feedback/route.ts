/**
 * GET /api/admin/feedback
 *
 * Admin read-only endpoint for feedback entries.
 *
 * API-ID: API-070
 * Auth: Admin (x-admin-secret OR user-session via resolveAdminContext)
 * Rate limit: disabled (admin routes skip middleware rate limiting)
 *
 * Query params:
 * - type?: idea | bug | feedback
 * - limit?: number (default 50, max 200)
 * - offset?: number (default 0)
 *
 * @see docs/ssot/SSOT_API.md — API-070
 * @see src/lib/services/feedbackService.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAdminContext } from '@/lib/auth/resolveAdminContext';
import { getAdminFeedback } from '@/lib/services/feedbackService';
import type { FeedbackType } from '@/lib/services/feedbackService';

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set(['idea', 'bug', 'feedback']);

export async function GET(request: NextRequest) {
  // =========================================================================
  // 1. Admin auth (resolveAdminContext — MANDATORY)
  // =========================================================================
  const adminContext = await resolveAdminContext(request);

  if (!adminContext) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Invalid admin credentials',
        },
      },
      { status: 403 },
    );
  }

  // =========================================================================
  // 2. Parse and validate query params
  // =========================================================================
  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get('type');
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');

  // Validate type
  let type: FeedbackType | undefined;
  if (typeParam) {
    if (!VALID_TYPES.has(typeParam)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: "type must be one of: idea, bug, feedback",
          },
        },
        { status: 400 },
      );
    }
    type = typeParam as FeedbackType;
  }

  // Validate limit
  let limit = 50;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'limit must be a positive integer',
          },
        },
        { status: 400 },
      );
    }
    limit = Math.min(parsed, 200);
  }

  // Validate offset
  let offset = 0;
  if (offsetParam) {
    const parsed = parseInt(offsetParam, 10);
    if (isNaN(parsed) || parsed < 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'offset must be a non-negative integer',
          },
        },
        { status: 400 },
      );
    }
    offset = parsed;
  }

  // =========================================================================
  // 3. Fetch from service layer
  // =========================================================================
  try {
    const result = await getAdminFeedback({ type, limit, offset });

    return NextResponse.json({
      success: true,
      data: {
        items: result.items,
        total: result.total,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < result.total,
        },
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch feedback',
        },
      },
      { status: 500 },
    );
  }
}
