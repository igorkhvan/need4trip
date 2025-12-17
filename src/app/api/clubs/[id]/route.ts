/**
 * API: /api/clubs/[id]
 * 
 * GET - Получить детали клуба
 * PATCH - Обновить клуб
 * DELETE - Удалить клуб
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { getClubWithDetails, updateClub, deleteClub } from "@/lib/services/clubs";
import { respondError } from "@/lib/api/response";
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
    const user = await getCurrentUser();
    const club = await getClubWithDetails(id, user);

    return NextResponse.json({ club });
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
    
    // Get user from middleware (JWT already verified)
    const user = await getCurrentUserFromMiddleware(req);
    const body = await req.json();

    const club = await updateClub(id, body, user);

    return NextResponse.json({ club });
  } catch (error) {
    const { id } = await params;
    log.errorWithStack("Failed to update club", error, { clubId: id });
    return respondError(error);
  }
}

/**
 * DELETE /api/clubs/[id]
 * Удалить клуб
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    
    // Get user from middleware (JWT already verified)
    const user = await getCurrentUserFromMiddleware(req);
    await deleteClub(id, user);

    return NextResponse.json({ success: true });
  } catch (error) {
    const { id } = await params;
    log.errorWithStack("Failed to delete club", error, { clubId: id });
    return respondError(error);
  }
}

