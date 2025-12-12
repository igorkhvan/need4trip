/**
 * API: /api/clubs/[id]
 * 
 * GET - Получить детали клуба
 * PATCH - Обновить клуб
 * DELETE - Удалить клуб
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getClubWithDetails, updateClub, deleteClub } from "@/lib/services/clubs";
import { respondError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/clubs/[id]
 * Получить детали клуба
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    const club = await getClubWithDetails(params.id, user);

    return NextResponse.json({ club });
  } catch (error) {
    console.error(`[GET /api/clubs/${params.id}]`, error);
    return respondError(error);
  }
}

/**
 * PATCH /api/clubs/[id]
 * Обновить клуб
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const club = await updateClub(params.id, body, user);

    return NextResponse.json({ club });
  } catch (error) {
    console.error(`[PATCH /api/clubs/${params.id}]`, error);
    return respondError(error);
  }
}

/**
 * DELETE /api/clubs/[id]
 * Удалить клуб
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    await deleteClub(params.id, user);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[DELETE /api/clubs/${params.id}]`, error);
    return respondError(error);
  }
}

