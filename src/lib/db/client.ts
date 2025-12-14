import { createClient } from "@supabase/supabase-js";

import { Database } from "@/lib/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("🔧 [Supabase Client] Configuration:");
console.log("  - URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
console.log("  - Anon Key:", supabaseAnonKey ? "✅ Set" : "❌ Missing");

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ [Supabase Client] URL or anon key is missing. API calls will fail until env vars are set."
  );
  console.warn("Please check .env.local file");
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
  console.log("✅ [Supabase Client] Client created successfully");
} else {
  console.error("❌ [Supabase Client] Failed to create client");
}
