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
    const currencies = await getActiveCurrencies();
    return NextResponse.json(currencies);
  } catch (error) {
    console.error("[API] /api/currencies GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch currencies" },
      { status: 500 }
    );
  }
}
