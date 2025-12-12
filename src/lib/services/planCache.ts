/**
 * Club Plan Cache
 * 
 * In-memory cache for club plans to avoid frequent database queries
 */

import type { ClubPlan, ClubPlanIdType, ClubPlanLimits } from "@/lib/types/clubPlan";
import { extractPlanLimits } from "@/lib/types/clubPlan";
import { getAllClubPlans, getClubPlanById, getClubPlanLimits } from "@/lib/db/clubPlanRepo";

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class PlanCache {
  private plans: Map<ClubPlanIdType, CacheEntry<ClubPlan>> = new Map();
  private allPlans: CacheEntry<ClubPlan[]> | null = null;
  private readonly TTL = 3600 * 1000; // 1 hour in milliseconds

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > this.TTL;
  }

  /**
   * Get cached plan by ID
   */
  get(id: ClubPlanIdType): ClubPlan | null {
    const entry = this.plans.get(id);
    if (!entry || this.isExpired(entry)) {
      this.plans.delete(id);
      return null;
    }
    return entry.data;
  }

  /**
   * Set cached plan
   */
  set(id: ClubPlanIdType, plan: ClubPlan): void {
    this.plans.set(id, {
      data: plan,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all cached plans
   */
  getAll(): ClubPlan[] | null {
    if (!this.allPlans || this.isExpired(this.allPlans)) {
      this.allPlans = null;
      return null;
    }
    return this.allPlans.data;
  }

  /**
   * Set all plans cache
   */
  setAll(plans: ClubPlan[]): void {
    this.allPlans = {
      data: plans,
      timestamp: Date.now(),
    };
    
    // Also cache individual plans
    plans.forEach(plan => {
      this.set(plan.id, plan);
    });
  }

  /**
   * Clear cache for specific plan
   */
  invalidate(id: ClubPlanIdType): void {
    this.plans.delete(id);
  }

  /**
   * Clear all cache
   */
  invalidateAll(): void {
    this.plans.clear();
    this.allPlans = null;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.plans.size,
      entries: Array.from(this.plans.keys()),
    };
  }
}

// Singleton instance
const cache = new PlanCache();

// ============================================================================
// CACHED FUNCTIONS
// ============================================================================

/**
 * Get club plan by ID (cached)
 */
export async function getCachedClubPlan(id: ClubPlanIdType): Promise<ClubPlan> {
  // Try cache first
  const cached = cache.get(id);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from DB
  const plan = await getClubPlanById(id);
  cache.set(id, plan);
  return plan;
}

/**
 * Get all club plans (cached)
 */
export async function getCachedClubPlans(): Promise<ClubPlan[]> {
  // Try cache first
  const cached = cache.getAll();
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from DB
  const plans = await getAllClubPlans();
  cache.setAll(plans);
  return plans;
}

/**
 * Get club plan limits (cached)
 */
export async function getCachedClubPlanLimits(id: ClubPlanIdType): Promise<ClubPlanLimits> {
  const plan = await getCachedClubPlan(id);
  return extractPlanLimits(plan);
}

/**
 * Preload all plans into cache (useful on server startup)
 */
export async function preloadPlansCache(): Promise<void> {
  try {
    await getCachedClubPlans();
    console.log('[planCache] Plans preloaded successfully');
  } catch (error) {
    console.error('[planCache] Failed to preload plans:', error);
  }
}

/**
 * Invalidate cache for specific plan
 */
export function invalidatePlanCache(id: ClubPlanIdType): void {
  cache.invalidate(id);
}

/**
 * Invalidate all plans cache
 */
export function invalidateAllPlansCache(): void {
  cache.invalidateAll();
}

/**
 * Get cache statistics (for debugging)
 */
export function getPlanCacheStats(): { size: number; entries: string[] } {
  return cache.getStats();
}

// ============================================================================
// EXPORT CACHE INSTANCE (for advanced usage)
// ============================================================================

export { cache as planCache };

