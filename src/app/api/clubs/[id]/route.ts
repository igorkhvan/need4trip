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
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clubs/[id]
 * Получить детали клуба
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const club = await getClubWithDetails(id, user);

    return NextResponse.json({ club });
  } catch (error) {
    const { id } = await params;
    console.error(`[GET /api/clubs/${id}]`, error);
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
    const user = await getCurrentUser();
    const body = await req.json();

    const club = await updateClub(id, body, user);

    return NextResponse.json({ club });
  } catch (error) {
    const { id } = await params;
    console.error(`[PATCH /api/clubs/${id}]`, error);
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
    const user = await getCurrentUser();
    await deleteClub(id, user);

    return NextResponse.json({ success: true });
  } catch (error) {
    const { id } = await params;
    console.error(`[DELETE /api/clubs/${id}]`, error);
    return respondError(error);
  }
}

