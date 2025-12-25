/**
 * API Route: /api/currencies
 * 
 * GET - List active currencies
 * Public endpoint (no auth required)
 */

import { getActiveCurrencies } from "@/lib/db/currencyRepo";
import { log } from "@/lib/utils/logger";
import { respondSuccess, respondError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currencies = await getActiveCurrencies();
    log.debug("Loaded currencies", { count: currencies.length });
    return respondSuccess(currencies);
  } catch (error) {
    log.errorWithStack("Failed to fetch currencies", error);
    return respondError(error);
  }
}
