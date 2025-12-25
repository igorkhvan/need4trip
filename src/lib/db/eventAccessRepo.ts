import { getAdminDb } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { log } from "@/lib/utils/logger";

const table = "event_user_access";

export async function upsertEventAccess(
  eventId: string, 
  userId: string, 
  source: "owner" | "participant" | "link"
): Promise<void> {
  const db = getAdminDb();
  
  const insertData = {
    event_id: eventId,
    user_id: userId,
    source,
  };
  
  const { error } = await db
    .from(table)
    .upsert(insertData, { onConflict: "event_id,user_id" });
    
  if (error) {
    log.error("Failed to upsert event access", { eventId, userId, source, error });
    throw new InternalError("Failed to upsert event access", error);
  }
}

export async function listAccessibleEventIds(userId: string): Promise<string[]> {
  const db = getAdminDb();
  
  const { data, error } = await db
    .from(table)
    .select("event_id")
    .eq("user_id", userId);
    
  if (error) {
    log.error("Failed to list accessible events", { userId, error });
    throw new InternalError("Failed to list accessible events", error);
  }
  
  return (data || []).map((row) => row.event_id);
}
