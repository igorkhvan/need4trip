import { supabase } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";

const table = "event_user_access";

function ensureClient() {
  if (!supabase) {
    console.warn("Supabase client is not configured");
    return null;
  }
  return supabase;
}

export async function upsertEventAccess(eventId: string, userId: string, source: "owner" | "participant" | "link"): Promise<void> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }
  const { error } = await client.from(table).upsert(
    {
      event_id: eventId,
      user_id: userId,
      source,
    },
    { onConflict: "event_id,user_id" }
  );
  if (error) {
    console.error("Failed to upsert event access", error);
    throw new InternalError("Failed to upsert event access", error);
  }
}

export async function listAccessibleEventIds(userId: string): Promise<string[]> {
  const client = ensureClient();
  if (!client) return [];
  const { data, error } = await client.from(table).select("event_id").eq("user_id", userId);
  if (error) {
    console.error("Failed to list accessible events", error);
    throw new InternalError("Failed to list accessible events", error);
  }
  return (data ?? []).map((row) => row.event_id as string);
}
