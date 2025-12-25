/**
 * API Route: /api/plans
 * 
 * GET - List available club plans (public pricing page)
 */

import { listPublicPlans } from "@/lib/db/planRepo";
import { log } from "@/lib/utils/logger";
import { respondSuccess, respondError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    log.info("GET /api/plans - Fetching public plans");
    
    const plans = await listPublicPlans();
    
    log.info("GET /api/plans - Success", { count: plans.length });
    
    // All plans including FREE are now in DB
    return respondSuccess({ plans });
  } catch (error) {
    log.error("GET /api/plans - Failed", { error });
    return respondError(error);
  }
}
