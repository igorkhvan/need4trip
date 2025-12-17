/**
 * API Route: /api/currencies
 * 
 * GET - List active currencies
 * Public endpoint (no auth required)
 */

import { NextResponse } from "next/server";
import { getActiveCurrencies } from "@/lib/db/currencyRepo";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currencies = await getActiveCurrencies();
    log.debug("Loaded currencies", { count: currencies.length });
    return NextResponse.json(currencies);
  } catch (error) {
    log.errorWithStack("Failed to fetch currencies", error);
    return NextResponse.json(
      { error: "Failed to fetch currencies" },
      { status: 500 }
    );
  }
}
