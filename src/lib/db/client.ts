import { createClient } from "@supabase/supabase-js";

import { Database } from "@/lib/types/supabase";
import { log } from "@/lib/utils/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

log.info("Supabase client configuration", {
  url: !!supabaseUrl,
  anonKey: !!supabaseAnonKey,
});

if (!supabaseUrl || !supabaseAnonKey) {
  log.warn("Supabase configuration incomplete", {
    message: "URL or anon key is missing. API calls will fail until env vars are set.",
    hint: "Please check .env.local file",
  });
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
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

if (supabase) {
  log.info("Supabase client created successfully");
} else {
  log.error("Failed to create Supabase client");
}
