/**
 * Profile Notifications Settings API
 * GET: Get user notification settings
 * PATCH: Update user notification settings
 */

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { respondJSON, respondError } from "@/lib/api/response";
import { AuthError, ValidationError } from "@/lib/errors";
import {
  getUserNotificationSettings,
  updateUserNotificationSettings,
} from "@/lib/db/notificationSettingsRepo";
import { notificationSettingsUpdateSchema } from "@/lib/types/notification";

/**
 * GET /api/profile/notifications
 * Get current user notification settings
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      throw new AuthError("Требуется авторизация", undefined, 401);
    }
    
    const settings = await getUserNotificationSettings(currentUser.id);
    
    if (!settings) {
      throw new Error("Failed to load notification settings");
    }
    
    return respondJSON({
      settings,
    });
  } catch (error) {
    return respondError(error);
  }
}

/**
 * PATCH /api/profile/notifications
 * Update user notification settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      throw new AuthError("Требуется авторизация", undefined, 401);
    }
    
    const body = await request.json();
    
    // Validate request body
    const parsed = notificationSettingsUpdateSchema.parse(body);
    
    // Update settings
    const settings = await updateUserNotificationSettings(currentUser.id, parsed);
    
    return respondJSON({
      settings,
      message: "Настройки уведомлений обновлены",
    });
  } catch (error) {
    return respondError(error);
  }
}
