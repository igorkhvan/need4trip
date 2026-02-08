import { getAdminDb } from "./client";
import { log } from "@/lib/utils/logger";

/**
 * Получить общее количество событий, в которых пользователь зарегистрирован
 * (excludes soft-deleted events via inner join)
 */
export async function countTotalEventsForUser(userId: string): Promise<number> {
  const db = getAdminDb();
  const { count, error } = await db
    .from("event_participants")
    .select("event_id, events!inner(id)", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("events.deleted_at", null);

  if (error) {
    log.error("Failed to count total events for user", { userId, error });
    return 0;
  }
  return count ?? 0;
}

/**
 * Получить количество завершенных событий, в которых пользователь участвовал
 * (excludes soft-deleted events via inner join filter)
 */
export async function countCompletedEventsForUser(userId: string): Promise<number> {
  const db = getAdminDb();
  const { count, error } = await db
    .from("event_participants")
    .select("event_id, events!inner(date_time)", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("events.deleted_at", null)
    .lt("events.date_time", new Date().toISOString());

  if (error) {
    log.error("Failed to count completed events for user", { userId, error });
    return 0;
  }
  return count ?? 0;
}

/**
 * Получить количество событий, организованных пользователем
 * (excludes soft-deleted events)
 */
export async function countOrganizedEventsForUser(userId: string): Promise<number> {
  const db = getAdminDb();
  const { count, error } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("created_by_user_id", userId)
    .is("deleted_at", null);

  if (error) {
    log.error("Failed to count organized events for user", { userId, error });
    return 0;
  }
  return count ?? 0;
}
