import { supabase } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { DbParticipant } from "@/lib/mappers";
import { ParticipantRole, RegisterParticipantPayload } from "@/lib/types/participant";

const table = "event_participants";

function ensureClient() {
  if (!supabase) {
    console.warn("Supabase client is not configured");
    return null;
  }
  return supabase;
}

export async function listParticipants(
  eventId: string
): Promise<DbParticipant[]> {
  const client = ensureClient();
  if (!client) return [];
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Failed to list participants for event ${eventId}`, error);
    throw new InternalError("Failed to list participants", error);
  }

  return (data ?? []) as DbParticipant[];
}

export async function createParticipant(
  payload: RegisterParticipantPayload
): Promise<DbParticipant> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }
  const now = new Date().toISOString();
  const insertPayload = {
    event_id: payload.eventId,
    user_id: payload.userId ?? null,
    guest_session_id: payload.guestSessionId ?? null,
    display_name: payload.displayName,
    role: payload.role,
    custom_field_values: payload.customFieldValues ?? {},
    created_at: now,
  };

  const { data, error } = await client
    .from(table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create participant", error);
    throw new InternalError("Failed to create participant", error);
  }

  return data as DbParticipant;
}

export async function updateParticipantRole(
  id: string,
  role: ParticipantRole
): Promise<DbParticipant | null> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }
  const { data, error } = await client
    .from(table)
    .update({ role })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error(`Failed to update participant ${id}`, error);
    throw new InternalError("Failed to update participant", error);
  }

  return data ? (data as DbParticipant) : null;
}

// Backward compatibility with existing service import name
export const registerParticipant = createParticipant;

export async function countParticipants(eventId: string): Promise<number> {
  const client = ensureClient();
  if (!client) return 0;
  const { count, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) {
    console.error(`Failed to count participants for event ${eventId}`, error);
    throw new InternalError("Failed to count participants", error);
  }

  return count ?? 0;
}

export async function countParticipantsByRole(
  eventId: string,
  role: ParticipantRole
): Promise<number> {
  const client = ensureClient();
  if (!client) return 0;
  const { count, error } = await client
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("role", role);

  if (error) {
    console.error(
      `Failed to count participants for event ${eventId} and role ${role}`,
      error
    );
    throw new InternalError("Failed to count participants by role", error);
  }

  return count ?? 0;
}

export async function findParticipantByUser(
  eventId: string,
  userId: string
): Promise<DbParticipant | null> {
  const client = ensureClient();
  if (!client) return null;
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to find participant by user", error);
    throw new InternalError("Failed to find participant by user", error);
  }

  return data ? (data as DbParticipant) : null;
}

export async function findParticipantByDisplayName(
  eventId: string,
  displayName: string
): Promise<DbParticipant | null> {
  const client = ensureClient();
  if (!client) return null;
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("event_id", eventId)
    .ilike("display_name", displayName)
    .maybeSingle();

  if (error) {
    console.error("Failed to find participant by displayName", error);
    throw new InternalError("Failed to find participant by displayName", error);
  }

  return data ? (data as DbParticipant) : null;
}

export async function findParticipantById(id: string): Promise<DbParticipant | null> {
  const client = ensureClient();
  if (!client) return null;
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`Failed to find participant ${id}`, error);
    throw new InternalError("Failed to find participant", error);
  }

  return data ? (data as DbParticipant) : null;
}

export async function listEventIdsForUser(userId: string): Promise<string[]> {
  const client = ensureClient();
  if (!client) return [];
  const { data, error } = await client
    .from(table)
    .select("event_id")
    .eq("user_id", userId);
  if (error) {
    console.error("Failed to list participant events for user", error);
    throw new InternalError("Failed to list participant events for user", error);
  }
  return (data ?? []).map((row) => row.event_id as string);
}

export async function listParticipantEventIds(eventIds: string[]): Promise<string[]> {
  const client = ensureClient();
  if (!client) return [];
  if (!eventIds.length) return [];
  const { data, error } = await client
    .from(table)
    .select("event_id")
    .in("event_id", eventIds);
  if (error) {
    console.error("Failed to list participants by event ids", error);
    throw new InternalError("Failed to list participants by event ids", error);
  }
  return (data ?? []).map((row) => row.event_id as string);
}

export async function updateParticipant(
  id: string,
  patch: Partial<Pick<RegisterParticipantPayload, "displayName" | "role" | "customFieldValues">>
): Promise<DbParticipant | null> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }
  const updatePayload = {
    ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
    ...(patch.role !== undefined ? { role: patch.role } : {}),
    ...(patch.customFieldValues !== undefined
      ? { custom_field_values: patch.customFieldValues }
      : {}),
  };

  const { data, error } = await client
    .from(table)
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error(`Failed to update participant ${id}`, error);
    throw new InternalError("Failed to update participant", error);
  }

  return data ? (data as DbParticipant) : null;
}

export async function deleteParticipant(id: string): Promise<boolean> {
  const client = ensureClient();
  if (!client) {
    throw new InternalError("Supabase client is not configured");
  }
  const { error, count } = await client
    .from(table)
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    console.error(`Failed to delete participant ${id}`, error);
    throw new InternalError("Failed to delete participant", error);
  }

  return (count ?? 0) > 0;
}
