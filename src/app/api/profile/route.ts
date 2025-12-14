/**
 * API: /api/profile
 * 
 * GET - Получить профиль текущего пользователя (с клубами)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getUserClubs } from "@/lib/services/clubs";
import { getCityById } from "@/lib/db/cityRepo";
import { respondError } from "@/lib/api/response";
import { updateUser } from "@/lib/db/userRepo";
import { profileUpdateSchema } from "@/lib/types/user";
import { AuthError, ValidationError } from "@/lib/errors";

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

    // NOTE: Personal plans removed in billing v2.0 - only club plans exist
    // If needed in future, implement via user_subscriptions table

    // Hydrate city if cityId exists
    let city = null;
    if (user.cityId) {
      try {
        city = await getCityById(user.cityId);
      } catch (err) {
        console.error("[GET /api/profile] Failed to load city:", err);
      }
    }

    // TODO: Need4Trip: Load created events, joined events, statistics

    return NextResponse.json({
      user: {
        ...user,
        // NOTE: Personal plans removed in billing v2.0
        city: city ? { id: city.id, name: city.name, region: city.region } : null,
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

/**
 * PATCH /api/profile
 * Обновить профиль текущего пользователя
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new AuthError("Необходима авторизация");
    }

    const body = await req.json();
    
    // Validate input
    const parseResult = profileUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError("Ошибка валидации", parseResult.error.errors);
    }
    
    const { name, cityId, carBrandId, carModelText } = parseResult.data;
    
    // Update user
    const updatedUser = await updateUser(user.id, {
      name,
      cityId,
      carBrandId,
      carModelText,
    });
    
    // Hydrate city
    let city = null;
    if (updatedUser.cityId) {
      try {
        city = await getCityById(updatedUser.cityId);
      } catch (err) {
        console.error("[PATCH /api/profile] Failed to load city:", err);
      }
    }
    
    return NextResponse.json({
      user: {
        ...updatedUser,
        city: city ? { id: city.id, name: city.name, region: city.region } : null,
      },
    });
  } catch (error) {
    return respondError(error);
  }
}
