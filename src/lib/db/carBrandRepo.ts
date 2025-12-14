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

/**
 * Получить марки автомобилей по списку ID (batch load)
 */
export async function getCarBrandsByIds(ids: string[]): Promise<CarBrand[]> {
  if (ids.length === 0) return [];
  
  const client = ensureClient();
  if (!client) return [];
  
  const { data, error } = await client
    .from(table)
    .select("id, name, slug")
    .in("id", ids);

  if (error) {
    console.error("[getCarBrandsByIds] Failed to get car brands", error);
    return [];
  }

  return (data ?? []) as CarBrand[];
}
