import { supabase } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { CarBrand } from "@/lib/types/event";

const table = "car_brands";

function ensureClient() {
  if (!supabase) {
    console.warn("Supabase client is not configured");
    return null;
  }
  return supabase;
}

export async function listCarBrands(): Promise<CarBrand[]> {
  const client = ensureClient();
  if (!client) return [];
  const { data, error } = await client
    .from(table)
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    console.error("[listCarBrands] Failed to list car brands", error);
    throw new InternalError("Failed to list car brands", error);
  }

  return (data ?? []) as CarBrand[];
}
