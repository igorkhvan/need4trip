/**
 * API: /api/clubs/[id]/subscription
 * 
 * GET - Получить подписку клуба
 * PATCH - Обновить подписку (upgrade/downgrade)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import {
  getClubSubscription,
  upgradeClubSubscription,
  downgradeClubSubscription,
} from "@/lib/services/subscriptions";
import { respondError } from "@/lib/api/response";
import type { ClubPlan } from "@/lib/types/club";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/clubs/[id]/subscription
 * Получить подписку клуба
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const subscription = await getClubSubscription(params.id);

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error(`[GET /api/clubs/${params.id}/subscription]`, error);
    return respondError(error);
  }
}

/**
 * PATCH /api/clubs/[id]/subscription
 * Обновить подписку
 * 
 * Body: { plan: ClubPlan, validUntil?: string } (для upgrade)
 * Body: { plan: "club_free" } (для downgrade)
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const { plan, validUntil } = body;

    if (!plan) {
      return NextResponse.json(
        { error: "Missing required field: plan" },
        { status: 400 }
      );
    }

    let subscription;
    if (plan === "club_free") {
      // Downgrade
      subscription = await downgradeClubSubscription(params.id, user);
    } else {
      // Upgrade
      if (!validUntil) {
        return NextResponse.json(
          { error: "validUntil is required for paid plans" },
          { status: 400 }
        );
      }
      subscription = await upgradeClubSubscription(params.id, plan as ClubPlan, validUntil, user);
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error(`[PATCH /api/clubs/${params.id}/subscription]`, error);
    return respondError(error);
  }
}

