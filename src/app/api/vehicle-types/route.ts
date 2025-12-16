import { NextResponse } from "next/server";
import { respondSuccess, respondError } from "@/lib/api/response";
import { getActiveVehicleTypes } from "@/lib/db/vehicleTypeRepo";

/**
 * GET /api/vehicle-types
 * 
 * Get all active vehicle types
 * Cached on backend for 24h
 */
export async function GET() {
  try {
    const vehicleTypes = await getActiveVehicleTypes();
    
    // Return as simple options for forms
    const options = vehicleTypes.map(type => ({
      value: type.id,
      label: type.nameRu,
    }));
    
    return respondSuccess({ vehicleTypes: options });
  } catch (error) {
    return respondError(error);
  }
}
