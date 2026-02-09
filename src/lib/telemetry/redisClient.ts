/**
 * Shared Redis Client for Abuse Telemetry
 *
 * Uses the same Upstash Redis instance as rate limiting.
 * Lazy initialization with graceful degradation.
 *
 * Compatible with both Node.js and Edge runtimes
 * (Upstash Redis uses HTTP — no persistent connections).
 *
 * If UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set,
 * all telemetry operations silently degrade to no-ops.
 */

import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
let _initAttempted = false;

/**
 * Get the Redis client for telemetry operations.
 * Returns null if Redis is not configured (graceful degradation).
 */
export function getTelemetryRedis(): Redis | null {
  if (_redis) return _redis;
  if (_initAttempted) return null;

  _initAttempted = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    _redis = new Redis({ url, token });
    return _redis;
  } catch {
    return null;
  }
}
