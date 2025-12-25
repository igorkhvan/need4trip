/**
 * API: /api/profile
 * 
 * GET - Получить профиль текущего пользователя (с клубами)
 */

import { NextRequest } from "next/server";
import { getCurrentUser, getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";
import { getUserClubs } from "@/lib/services/clubs";
import { getCityById } from "@/lib/db/cityRepo";
import { respondSuccess, respondError } from "@/lib/api/response";
import { updateUser } from "@/lib/db/userRepo";
import { profileUpdateSchema } from "@/lib/types/user";
import { AuthError, ValidationError } from "@/lib/errors";
import { getUserEventStats } from "@/lib/services/userStats";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile
 * Получить полный профиль текущего пользователя
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new AuthError("Необходима авторизация");
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
        log.warn("Failed to load city for user profile", { userId: user.id, cityId: user.cityId, error: err });
      }
    }

    // Получить статистику событий
    const eventStats = await getUserEventStats(user.id);

    return respondSuccess({
      user: {
        ...user,
        // NOTE: Personal plans removed in billing v2.0
        city: city ? { id: city.id, name: city.name, region: city.region } : null,
      },
      clubs,
      stats: {
        clubsCount: clubs.length,
        totalEvents: eventStats.totalEvents,
        completedEvents: eventStats.completedEvents,
        organizedEvents: eventStats.organizedEvents,
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
    // Get user from middleware (JWT already verified)
    const user = await getCurrentUserFromMiddleware(req);
    
    if (!user) {
      throw new AuthError("Необходима авторизация");
    }

    const body = await req.json();
    
    // Validate input
    const parseResult = profileUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      throw new ValidationError("Ошибка валидации", parseResult.error.errors);
    }
    
    const { name, email, bio, phone, cityId, carBrandId, carModelText } = parseResult.data;
    
    // Update user
    const updatedUser = await updateUser(user.id, {
      name,
      email,
      bio,
      phone,
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
        log.warn("Failed to load city for updated user profile", { userId: updatedUser.id, cityId: updatedUser.cityId, error: err });
      }
    }
    
    return respondSuccess({
      user: {
        ...updatedUser,
        city: city ? { id: city.id, name: city.name, region: city.region } : null,
      },
    });
  } catch (error) {
    return respondError(error);
  }
}
