/**
 * API: /api/clubs/[id]
 * 
 * GET - Получить детали клуба
 * PATCH - Обновить клуб
 * DELETE - Удалить клуб
 */

import { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/lib/auth/resolveCurrentUser";
import { getClubWithDetails, updateClub, archiveClub } from "@/lib/services/clubs";
import { respondSuccess, respondError } from "@/lib/api/response";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clubs/[id]
 * Получить детали клуба
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    // GET is public, but may need user context for membership check
    // Canonical auth resolution (ADR-001): uses cookie fallback for GET
    const user = await resolveCurrentUser(req);
    const club = await getClubWithDetails(id, user);

    return respondSuccess({ club });
  } catch (error) {
    const { id } = await params;
    log.errorWithStack("Failed to get club details", error, { clubId: id });
    return respondError(error);
  }
}

/**
 * PATCH /api/clubs/[id]
 * Обновить клуб
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    
    // Canonical auth resolution (ADR-001)
    const user = await resolveCurrentUser(req);
    const body = await req.json();

    const club = await updateClub(id, body, user);

    return respondSuccess({ club });
  } catch (error) {
    const { id } = await params;
    log.errorWithStack("Failed to update club", error, { clubId: id });
    return respondError(error);
  }
}

/**
 * DELETE /api/clubs/[id]
 * Archive club (soft-delete)
 * Per SSOT_CLUBS_DOMAIN.md §8.3: Archives club by setting archived_at timestamp.
 * Archived clubs are excluded from public listings but can still be read.
 * Idempotent: if already archived, returns success.
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    
    // Canonical auth resolution (ADR-001)
    const user = await resolveCurrentUser(req);
    await archiveClub(id, user);

    return respondSuccess({ success: true });
  } catch (error) {
    const { id } = await params;
    log.errorWithStack("Failed to archive club", error, { clubId: id });
    return respondError(error);
  }
}

