import { supabase, ensureClient } from "@/lib/db/client";
import { InternalError } from "@/lib/errors";
import { CarBrand } from "@/lib/types/event";
import { log } from "@/lib/utils/logger";

const table = "car_brands";

export async function listCarBrands(): Promise<CarBrand[]> {
  ensureClient();
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from(table)
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    log.error("Failed to list car brands", { error });
    throw new InternalError("Failed to list car brands", error);
  }

  return (data ?? []) as CarBrand[];
}

/**
 * Получить марки автомобилей по списку ID (batch load)
 */
export async function getCarBrandsByIds(ids: string[]): Promise<CarBrand[]> {
  if (ids.length === 0) return [];
  
  ensureClient();
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from(table)
    .select("id, name, slug")
    .in("id", ids);

  if (error) {
    log.error("Failed to get car brands by IDs", { count: ids.length, error });
    return [];
  }

  return (data ?? []) as CarBrand[];
}
