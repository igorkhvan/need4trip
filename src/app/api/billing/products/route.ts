/**
 * GET /api/billing/products
 * 
 * Purpose: Return active purchasable products
 * Spec: Billing v4 - single source of truth for pricing
 * 
 * Returns: BillingProduct[] (at least EVENT_UPGRADE_500)
 */

import { NextResponse } from "next/server";
import { getActiveProducts } from "@/lib/db/billingProductsRepo";
import { respondSuccess, respondError } from "@/lib/api/respond";
import { logger } from "@/lib/utils/logger";

export async function GET() {
  try {
    const products = await getActiveProducts();

    logger.info("Fetched active billing products", { count: products.length });

    return respondSuccess(products);
  } catch (error) {
    logger.error("Failed to fetch billing products", { error });
    return respondError(500, {
      code: "INTERNAL_ERROR",
      message: "Failed to fetch products",
    });
  }
}

