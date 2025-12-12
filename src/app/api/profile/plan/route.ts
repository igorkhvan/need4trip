/**
 * API: /api/profile/plan
 * 
 * GET - Получить личный план пользователя
 * PATCH - Обновить личный план (upgrade/downgrade)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import {
  getPersonalPlan,
  upgradePersonalPlan,
  downgradePersonalPlan,
} from "@/lib/services/subscriptions";
import { respondError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/plan
 * Получить личный план
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

    const plan = await getPersonalPlan(user.id);

    return NextResponse.json({ plan });
  } catch (error) {
    return respondError(error);
  }
}

/**
 * PATCH /api/profile/plan
 * Обновить личный план
 * 
 * Body: { action: "upgrade" | "downgrade" }
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (!action || (action !== "upgrade" && action !== "downgrade")) {
      return NextResponse.json(
        { error: 'action must be "upgrade" or "downgrade"' },
        { status: 400 }
      );
    }

    let success;
    if (action === "upgrade") {
      // TODO: Need4Trip: Integration with payment system before upgrade
      success = await upgradePersonalPlan(user.id, user);
    } else {
      success = await downgradePersonalPlan(user.id, user);
    }

    const plan = await getPersonalPlan(user.id);

    return NextResponse.json({ success, plan });
  } catch (error) {
    return respondError(error);
  }
}

