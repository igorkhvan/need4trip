/**
 * API Route: /api/plans
 * 
 * GET - List available club plans (public pricing page)
 */

import { NextResponse } from "next/server";
import { listPublicPlans } from "@/lib/db/planRepo";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    log.info("GET /api/plans - Fetching public plans");
    
    const plans = await listPublicPlans();
    
    log.info("GET /api/plans - Success", { count: plans.length });
    
    // All plans including FREE are now in DB
    return NextResponse.json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    log.error("GET /api/plans - Failed", { error });
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch plans" 
      },
      { status: 500 }
    );
  }
}
