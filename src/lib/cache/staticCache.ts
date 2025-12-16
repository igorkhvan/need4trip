/**
 * Static Data Cache
 * 
 * Production-ready caching for static reference data.
 * Works in serverless environments, handles errors gracefully, prevents race conditions.
 * 
 * Features:
 * - Automatic TTL-based expiration
 * - O(1) key lookups via Map
 * - Concurrent load prevention
 * - Graceful error handling
 * - Built-in logging
 * 
 * @example
 * const cache = new StaticCache({
 *   ttl: 24 * 60 * 60 * 1000,
 *   name: 'currencies',
 * }, async () => {
 *   return await loadFromDB();
 * }, (item) => item.code);
 * 
 * const all = await cache.getAll();
 * const item = await cache.getByKey('USD');
 */

import { log } from "@/lib/utils/logger";

export interface CacheConfig {
  ttl: number;           // Cache TTL in milliseconds
  name: string;          // Cache name for logging/debugging
}

export class StaticCache<T> {
  private cache: T[] = [];
  private map: Map<string, T> = new Map();
  private timestamp = 0;
  private loading = false;

  constructor(
    private config: CacheConfig,
    private loader: () => Promise<T[]>,
    private keyExtractor: (item: T) => string
  ) {}

  /**
   * Get all cached items
   * Automatically reloads if cache is expired
   */
  async getAll(): Promise<T[]> {
    await this.ensureLoaded();
    return this.cache;
  }

  /**
   * Get single item by key (O(1) lookup)
   */
  async getByKey(key: string): Promise<T | null> {
    await this.ensureLoaded();
    return this.map.get(key) ?? null;
  }

  /**
   * Get multiple items by keys
   * Returns Map for efficient lookup by caller
   */
  async getByKeys(keys: string[]): Promise<Map<string, T>> {
    await this.ensureLoaded();
    const result = new Map<string, T>();
    
    keys.forEach(key => {
      const item = this.map.get(key);
      if (item) {
        result.set(key, item);
      }
    });
    
    return result;
  }

  /**
   * Force cache reload
   * Safe to call concurrently - prevents duplicate loads
   */
  async reload(): Promise<void> {
    // Prevent concurrent reloads
    if (this.loading) {
      // Wait for current reload to finish
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }

    this.loading = true;

    try {
      const items = await this.loader();
      
      // Update cache atomically
      this.cache = items;
      this.map.clear();
      items.forEach(item => {
        const key = this.keyExtractor(item);
        this.map.set(key, item);
      });
      this.timestamp = Date.now();
      
      log.info(`Cache loaded: ${this.config.name}`, { 
        count: items.length,
        ttlMinutes: Math.round(this.config.ttl / 60000),
      });
    } catch (error) {
      log.error(`Cache reload failed: ${this.config.name}`, { error });
      // Don't clear existing cache on error - graceful degradation
      // Old data is better than no data
    } finally {
      this.loading = false;
    }
  }

  /**
   * Clear cache (for testing or manual invalidation)
   */
  clear(): void {
    this.cache = [];
    this.map.clear();
    this.timestamp = 0;
    log.debug(`Cache cleared: ${this.config.name}`);
  }

  /**
   * Check if cache is valid (loaded and not expired)
   */
  isValid(): boolean {
    if (this.cache.length === 0) return false;
    const age = Date.now() - this.timestamp;
    return age < this.config.ttl;
  }

  /**
   * Get cache age in milliseconds
   */
  getAge(): number {
    if (this.timestamp === 0) return -1;
    return Date.now() - this.timestamp;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      name: this.config.name,
      size: this.cache.length,
      age: this.getAge(),
      valid: this.isValid(),
      loading: this.loading,
    };
  }

  /**
   * Ensure cache is loaded and valid
   */
  private async ensureLoaded(): Promise<void> {
    if (this.isValid()) {
      return;
    }
    
    await this.reload();
  }
}
