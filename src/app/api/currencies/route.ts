/**
 * API Route: /api/currencies
 * 
 * GET - List active currencies
 */

import { NextResponse } from "next/server";
import { getActiveCurrencies } from "@/lib/db/currencyRepo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    console.log("📡 [API /api/currencies] Starting request...");
    const currencies = await getActiveCurrencies();
    console.log(`✅ [API /api/currencies] Loaded ${currencies.length} currencies:`, currencies);
    return NextResponse.json(currencies);
  } catch (error) {
    console.error("❌ [API /api/currencies] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch currencies" },
      { status: 500 }
    );
  }
}
