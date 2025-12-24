import { NextResponse } from "next/server";
import { respondSuccess, respondError } from "@/lib/api/response";
import { getActiveVehicleTypes } from "@/lib/db/vehicleTypeRepo";
import { log } from "@/lib/utils/logger";

/**
 * GET /api/vehicle-types
 * 
 * Get all active vehicle types
 * Public endpoint (no auth required)
 * 
 * ⚡ PERFORMANCE: Cached for 1 hour
 * - CDN/Browser cache: 1 hour
 * - Stale-while-revalidate: 24 hours
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
    
    const response = respondSuccess({ vehicleTypes: options });
    
    // ⚡ HTTP Cache Headers for CDN and Browser
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );
    
    return response;
  } catch (error) {
    log.errorWithStack("Failed to get vehicle types", error);
    return respondError(error);
  }
}

// ⚡ Next.js Route Segment Config
// Revalidate this route every 1 hour (ISR)
export const revalidate = 3600;
