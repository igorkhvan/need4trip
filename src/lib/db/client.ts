import { createClient } from "@supabase/supabase-js";

import { Database } from "@/lib/types/supabase";
import { log } from "@/lib/utils/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

log.info("Supabase client configuration", {
  url: !!supabaseUrl,
  anonKey: !!supabaseAnonKey,
  serviceRoleKey: !!supabaseServiceRoleKey,
});

if (!supabaseUrl || !supabaseAnonKey) {
  log.warn("Supabase configuration incomplete", {
    message: "URL or anon key is missing. API calls will fail until env vars are set.",
    hint: "Please check .env.local file",
  });
}

// Client for browser/public use (with RLS)
// NOTE: This client is used in Server Components where we don't have access to user session
// RLS policies that use auth.uid() won't work with this client
// For server-side operations, use supabaseAdmin (service role) instead
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
      },
    })
  : null;

// Admin client for server-side operations (bypasses RLS)
// Use this for operations where you've already done authorization checks in application code
// This is necessary because we use custom JWT auth (not Supabase Auth)
// so auth.uid() in RLS policies doesn't work for our authenticated users
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Ensure Supabase client is initialized
 * Throws error if client is not available
 */
export function ensureClient(): void {
  if (!supabase) {
    throw new Error("Supabase client is not initialized. Check your environment variables.");
  }
}

/**
 * Ensure Supabase admin client is initialized
 * Throws error if client is not available
 */
export function ensureAdminClient(): void {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not initialized. Check SUPABASE_SERVICE_ROLE_KEY.");
  }
}

/**
 * Get Supabase admin client with automatic validation
 * 
 * **USE THIS in all repository functions instead of manual checks.**
 * 
 * Replaces pattern:
 * ```typescript
 * ensureAdminClient();
 * if (!supabaseAdmin) return ...;
 * ```
 * 
 * With:
 * ```typescript
 * const db = getAdminDb();
 * ```
 * 
 * @throws Error if admin client not initialized
 * @returns Supabase admin client (guaranteed non-null)
 * 
 * @example
 * // ✅ CORRECT (new pattern)
 * export async function getEventById(id: string) {
 *   const db = getAdminDb();
 *   const { data } = await db.from('events').select('*').eq('id', id).single();
 *   return data;
 * }
 * 
 * @example
 * // ❌ OLD (being phased out)
 * export async function getEventById(id: string) {
 *   ensureAdminClient();
 *   if (!supabaseAdmin) return null;
 *   const { data } = await supabaseAdmin.from('events')...
 * }
 */
export function getAdminDb() {
  ensureAdminClient();
  
  // TypeScript knows supabaseAdmin is non-null after ensureAdminClient()
  // but we add explicit check for runtime safety
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not initialized");
  }
  
  return supabaseAdmin;
}

/**
 * Get Supabase admin client (safe version for optional operations)
 * 
 * Returns null if client not available (for graceful degradation).
 * Use this only when the operation is truly optional.
 * 
 * @returns Supabase admin client or null
 * 
 * @example
 * export async function listEvents() {
 *   const db = getAdminDbSafe();
 *   if (!db) return { data: [], total: 0 };
 *   
 *   const { data } = await db.from('events').select('*');
 *   return { data: data || [], total: data?.length || 0 };
 * }
 */
export function getAdminDbSafe() {
  try {
    ensureAdminClient();
    return supabaseAdmin;
  } catch {
    return null;
  }
}

if (supabase) {
  log.info("Supabase client created successfully");
} else {
  log.error("Failed to create Supabase client");
}

// Admin client is only available on server-side
// Don't log warning on client as SERVICE_ROLE_KEY should never be exposed to browser
if (typeof window === 'undefined') {
  if (supabaseAdmin) {
    log.info("Supabase admin client created successfully");
  } else {
    log.warn("Supabase admin client not available (SERVICE_ROLE_KEY missing)");
  }
}
