/**
 * Repository: billing_products
 * Purpose: CRUD for purchasable products (one-off credits)
 * Spec: Billing v4 - single source of truth for pricing
 * 
 * Caching: All products cached via StaticCache (TTL 5 min)
 * Same pattern as planRepo.ts for consistency
 */

import { getAdminDb } from "./client";
import type { BillingProduct } from "@/lib/types/billing";
import type { Database } from "./types";
import { InternalError } from "@/lib/errors";
import { logger } from "@/lib/utils/logger";
import { StaticCache } from "@/lib/cache/staticCache";

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
// Cache Configuration
// ============================================================================

const productsCache = new StaticCache<BillingProduct>(
  {
    ttl: 5 * 60 * 1000, // 5 minutes - products may change when pricing updates
    name: 'billing_products',
  },
  async () => {
    const db = getAdminDb();

    const { data, error } = await db
      .from("billing_products")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("Failed to load billing products for cache", { error });
      throw new InternalError("Failed to load billing products", error);
    }

    return (data as DbBillingProduct[]).map(mapDbToProduct);
  },
  (product) => product.code // Key extractor
);

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all active products (public API, cached)
 */
export async function getActiveProducts(): Promise<BillingProduct[]> {
  const allProducts = await productsCache.getAll();
  return allProducts.filter(p => p.isActive);
}

/**
 * Get product by code (cached, O(1) lookup)
 */
export async function getProductByCode(code: string): Promise<BillingProduct | null> {
  return await productsCache.getByKey(code) ?? null;
}

/**
 * Check if product is active (cached)
 */
export async function isProductActive(code: string): Promise<boolean> {
  const product = await getProductByCode(code);
  return product?.isActive ?? false;
}

/**
 * Invalidate cache (for admin operations)
 * Call this after updating products
 */
export async function invalidateProductsCache(): Promise<void> {
  productsCache.clear();
  logger.info("Billing products cache invalidated");
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

