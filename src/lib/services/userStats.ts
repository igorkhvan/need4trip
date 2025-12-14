import { supabase, ensureClient } from "../db/client";

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
  ensureClient();
  if (!supabase) {
    return { totalEvents: 0, completedEvents: 0, organizedEvents: 0 };
  }

  try {
    // 1. Всего событий (где пользователь зарегистрирован)
    const { count: totalCount } = await supabase
      .from("event_participants")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    // 2. Завершенные события (date_time < NOW())
    const { count: completedCount } = await supabase
      .from("event_participants")
      .select("event_id, events!inner(date_time)", { count: "exact", head: true })
      .eq("user_id", userId)
      .lt("events.date_time", new Date().toISOString());

    // 3. Организованные события (created_by_user_id)
    const { count: organizedCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("created_by_user_id", userId);

    return {
      totalEvents: totalCount || 0,
      completedEvents: completedCount || 0,
      organizedEvents: organizedCount || 0,
    };
  } catch (error) {
    console.error("[getUserEventStats] Error:", error);
    return {
      totalEvents: 0,
      completedEvents: 0,
      organizedEvents: 0,
    };
  }
}

