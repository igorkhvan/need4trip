import { NextResponse } from "next/server";
import { respondSuccess, respondError } from "@/lib/api/response";
import { getActiveVehicleTypes } from "@/lib/db/vehicleTypeRepo";
import { log } from "@/lib/utils/logger";

/**
 * GET /api/vehicle-types
 * 
 * Get all active vehicle types
 * Cached on backend for 24h
 * Public endpoint (no auth required)
 */
export async function GET() {
  try {
    const vehicleTypes = await getActiveVehicleTypes();
    
    log.debug("Loaded vehicle types", { count: vehicleTypes.length });
    
    // Return as simple options for forms
    const options = vehicleTypes.map(type => ({
      value: type.id,
      label: type.nameRu,
    }));
    
    return respondSuccess({ vehicleTypes: options });
  } catch (error) {
    log.errorWithStack("Failed to get vehicle types", error);
    return respondError(error);
  }
}
