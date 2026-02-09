/**
 * Admin API: Abuse Users
 *
 * API-067: GET /api/admin/abuse/users
 *
 * Per-user abuse/anomaly summaries sorted by score.
 * READ-ONLY — no mutations, no side effects.
 *
 * Auth: Admin secret (x-admin-secret header)
 * Rate limit: None (admin route, secret-protected at middleware)
 *
 * NOTE (ADR-001.5):
 *   This endpoint exists for machine / external access.
 *   RSC pages MUST NOT call this route — they call the service layer directly.
 *
 * @see docs/ssot/SSOT_API.md — API-067
 * @see docs/adr/active/ADR-001.5.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveAdminContext } from '@/lib/auth/resolveAdminContext';
import { getAbuseUsers } from '@/lib/services/adminAbuse';

export const dynamic = 'force-dynamic';

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
          code: 'FORBIDDEN',
          message: 'Invalid admin credentials',
        },
      },
      { status: 403 },
    );
  }

  // =========================================================================
  // 2. Read-only data fetch
  // =========================================================================
  try {
    const users = await getAbuseUsers();

    return NextResponse.json({
      success: true,
      data: { users },
    });
  } catch (err) {
    console.error('[Admin/Abuse/Users] Unexpected error', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch abuse users',
        },
      },
      { status: 500 },
    );
  }
}
