import {
  countTotalEventsForUser,
  countCompletedEventsForUser,
  countOrganizedEventsForUser,
} from "../db/userStatsRepo";
import { log } from "@/lib/utils/logger";

/**
 * Статистика событий пользователя
 */
export interface UserEventStats {
  totalEvents: number;      // Всего событий (зарегистрирован)
  completedEvents: number;  // Завершенные события
  organizedEvents: number;  // Организованные события
}

/**
 * Получить статистику событий пользователя
 */
export async function getUserEventStats(userId: string): Promise<UserEventStats> {
  try {
    const [totalEvents, completedEvents, organizedEvents] = await Promise.all([
      countTotalEventsForUser(userId),
      countCompletedEventsForUser(userId),
      countOrganizedEventsForUser(userId),
    ]);

    return {
      totalEvents,
      completedEvents,
      organizedEvents,
    };
  } catch (error) {
    log.error("[getUserEventStats] Error:", { error, userId });
    return {
      totalEvents: 0,
      completedEvents: 0,
      organizedEvents: 0,
    };
  }
}

