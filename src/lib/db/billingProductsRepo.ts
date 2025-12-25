/**
 * Repository: billing_products
 * Purpose: CRUD for purchasable products (one-off credits)
 * Spec: Billing v4 - single source of truth for pricing
 */

import { getAdminDb } from "./client";
import type { BillingProduct } from "@/lib/types/billing";
import type { Database } from "./types";
import { InternalError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";

type DbBillingProduct = Database["public"]["Tables"]["billing_products"]["Row"];

// ============================================================================
// Mappers
// ============================================================================

function mapDbToProduct(db: DbBillingProduct): BillingProduct {
  return {
    code: db.code,
    title: db.title,
    type: db.type as "credit",
    price: Number(db.price),                 // ⚡ Normalized (was price_kzt)
    currencyCode: db.currency_code,
    isActive: db.is_active,
    constraints: db.constraints as Record<string, any>,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all active products (public API)
 */
export async function getActiveProducts(): Promise<BillingProduct[]> {
  const db = getAdminDb();

  const { data, error } = await db
    .from("billing_products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("Failed to fetch active products", { error });
    throw new InternalError("Failed to fetch products", error);
  }

  return data.map(mapDbToProduct);
}

/**
 * Get product by code
 */
export async function getProductByCode(code: string): Promise<BillingProduct | null> {
  const db = getAdminDb();

  const { data, error } = await db
    .from("billing_products")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    logger.error("Failed to fetch product", { code, error });
    throw new InternalError("Failed to fetch product", error);
  }

  return data ? mapDbToProduct(data) : null;
}

/**
 * Check if product is active
 */
export async function isProductActive(code: string): Promise<boolean> {
  const product = await getProductByCode(code);
  return product?.isActive ?? false;
}

// ============================================================================
// Create/Update Operations (admin only)
// ============================================================================

/**
 * Create or update product
 * Note: Typically done via migrations, not runtime
 */
export async function upsertProduct(product: Omit<BillingProduct, "createdAt" | "updatedAt">): Promise<BillingProduct> {
  const db = getAdminDb();

  const { data, error } = await db
    .from("billing_products")
    .upsert({
      code: product.code,
      title: product.title,
      type: product.type,
      price: product.price,                  // ⚡ Normalized (was price_kzt)
      currency_code: product.currencyCode,
      is_active: product.isActive,
      constraints: product.constraints,
    })
    .select()
    .single();

  if (error || !data) {
    logger.error("Failed to upsert product", { product, error });
    throw new InternalError("Failed to upsert product", error);
  }

  logger.info("Product upserted", { code: product.code });
  return mapDbToProduct(data);
}

/**
 * Deactivate product (soft delete)
 */
export async function deactivateProduct(code: string): Promise<void> {
  const db = getAdminDb();

  const { error } = await db
    .from("billing_products")
    .update({ is_active: false })
    .eq("code", code);

  if (error) {
    logger.error("Failed to deactivate product", { code, error });
    throw new InternalError("Failed to deactivate product", error);
  }

  logger.info("Product deactivated", { code });
}

