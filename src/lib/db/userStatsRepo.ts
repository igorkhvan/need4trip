import { getAdminDb } from "./client";
import { log } from "@/lib/utils/logger";

/**
 * Получить общее количество событий, в которых пользователь зарегистрирован
 */
export async function countTotalEventsForUser(userId: string): Promise<number> {
  const db = getAdminDb();
  const { count, error } = await db
    .from("event_participants")
    .select("event_id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    log.error("Failed to count total events for user", { userId, error });
    return 0;
  }
  return count ?? 0;
}

/**
 * Получить количество завершенных событий, в которых пользователь участвовал
 */
export async function countCompletedEventsForUser(userId: string): Promise<number> {
  const db = getAdminDb();
  const { count, error } = await db
    .from("event_participants")
    .select("event_id, events!inner(date_time)", { count: "exact", head: true })
    .eq("user_id", userId)
    .lt("events.date_time", new Date().toISOString());

  if (error) {
    log.error("Failed to count completed events for user", { userId, error });
    return 0;
  }
  return count ?? 0;
}

/**
 * Получить количество событий, организованных пользователем
 */
export async function countOrganizedEventsForUser(userId: string): Promise<number> {
  const db = getAdminDb();
  const { count, error } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("created_by_user_id", userId);

  if (error) {
    log.error("Failed to count organized events for user", { userId, error });
    return 0;
  }
  return count ?? 0;
}