/**
 * API: /api/clubs/[id]/unarchive
 * 
 * POST - Restore club from archive
 * Per SSOT_CLUBS_DOMAIN.md §8.3.1: Owner-only, if supported.
 */

import { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/lib/auth/resolveCurrentUser";
import { unarchiveClub } from "@/lib/services/clubs";
import { respondSuccess, respondError } from "@/lib/api/response";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/clubs/[id]/unarchive
 * Restore club from archive
 * 
 * Per SSOT_CLUBS_DOMAIN.md §8.3.1:
 * - Owner-only operation
 * - Allowed even when club is archived (whitelist)
 * - Idempotent: if already active, returns success
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    
    // Canonical auth resolution (ADR-001)
    const user = await resolveCurrentUser(req);
    await unarchiveClub(id, user);

    return respondSuccess({ success: true });
  } catch (error) {
    const { id } = await params;
    log.errorWithStack("Failed to unarchive club", error, { clubId: id });
    return respondError(error);
  }
}

