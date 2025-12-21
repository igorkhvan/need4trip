import { supabaseAdmin, ensureAdminClient } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { log } from "@/lib/utils/logger";

const table = "event_user_access";

export async function upsertEventAccess(
  eventId: string, 
  userId: string, 
  source: "owner" | "participant" | "link"
): Promise<void> {
  ensureAdminClient();
  if (!supabaseAdmin) {
    throw new InternalError("Supabase client is not configured");
  }
  
  const insertData = {
    event_id: eventId,
    user_id: userId,
    source,
  };
  
  const { error } = await supabaseAdmin
    .from(table)
    .upsert(insertData, { onConflict: "event_id,user_id" });
    
  if (error) {
    log.error("Failed to upsert event access", { eventId, userId, source, error });
    throw new InternalError("Failed to upsert event access", error);
  }
}

export async function listAccessibleEventIds(userId: string): Promise<string[]> {
  ensureAdminClient();
  if (!supabaseAdmin) return [];
  
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("event_id")
    .eq("user_id", userId);
    
  if (error) {
    log.error("Failed to list accessible events", { userId, error });
    throw new InternalError("Failed to list accessible events", error);
  }
  
  return (data || []).map((row) => row.event_id);
}
