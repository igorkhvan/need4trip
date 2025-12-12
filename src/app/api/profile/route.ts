/**
 * API: /api/profile
 * 
 * GET - Получить профиль текущего пользователя (с клубами)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getUserClubs } from "@/lib/services/clubs";
import { getPersonalPlan } from "@/lib/services/subscriptions";
import { respondError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile
 * Получить полный профиль текущего пользователя
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    // Получить клубы пользователя
    const clubs = await getUserClubs(user.id);

    // Получить личный план
    const plan = await getPersonalPlan(user.id);

    // TODO: Need4Trip: Load created events, joined events, statistics

    return NextResponse.json({
      user: {
        ...user,
        plan,
      },
      clubs,
      stats: {
        clubsCount: clubs.length,
        // TODO: eventsCreated, eventsJoined, etc.
      },
    });
  } catch (error) {
    return respondError(error);
  }
}

