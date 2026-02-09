/**
 * Abuse Telemetry — Fire-and-Forget Counters
 *
 * Tracks abuse-related metrics using Upstash Redis INCR + EXPIRE.
 * All public functions are fire-and-forget (void return, no await needed).
 *
 * Key schema
 * ──────────
 *   Per-user (15 min window):  abuse:u:{userId}:{metric}
 *   System  (per-minute):      abuse:sys:{metric}:{minuteBucket}
 *   Active users set:          abuse:active_users
 *
 * TTL strategy
 * ────────────
 *   Per-user keys:   900 s  (15 min window)
 *   System keys:     120 s  (2 min buffer for reads)
 *   Active-users set: 900 s (same as user window)
 */

import { getTelemetryRedis } from './redisClient';

// ============================================================================
// Constants
// ============================================================================

const USER_WINDOW_TTL = 900;    // 15 minutes
const SYSTEM_MINUTE_TTL = 120;  // 2 minutes (buffer)
const ACTIVE_USERS_TTL = 900;   // 15 minutes

// ============================================================================
// Metric names
// ============================================================================

export const USER_METRICS = [
  'events.create',
  'events.update',
  'events.delete',
  'clubs.create',
  'join_requests.create',
  'club_audit_log.actions',
  'errors.402',
  'errors.403',
  'ai.generate_rules',
  'feedback.submit',
  'feedback.rejected.rate_limit',
  'feedback.rejected.validation',
  'feedback.rejected.dedupe',
] as const;

export type UserMetricName = (typeof USER_METRICS)[number];

export const SYSTEM_METRICS = [
  'total_writes',
  'errors.429',
  'errors.402',
  'errors.403',
] as const;

export type SystemMetricName = (typeof SYSTEM_METRICS)[number];

// ============================================================================
// Key builders (exported for aggregation layer)
// ============================================================================

export function userMetricKey(userId: string, metric: string): string {
  return `abuse:u:${userId}:${metric}`;
}

export function systemMinuteKey(metric: string): string {
  const bucket = Math.floor(Date.now() / 60000);
  return `abuse:sys:${metric}:${bucket}`;
}

export const ACTIVE_USERS_KEY = 'abuse:active_users';

// ============================================================================
// Internal helpers (fire-and-forget)
// ============================================================================

async function safeIncrement(key: string, ttl: number): Promise<void> {
  try {
    const redis = getTelemetryRedis();
    if (!redis) return;

    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttl);
    await pipeline.exec();
  } catch {
    // Silently fail — telemetry must NEVER break the application
  }
}

async function safeAddActiveUser(userId: string): Promise<void> {
  try {
    const redis = getTelemetryRedis();
    if (!redis) return;

    const pipeline = redis.pipeline();
    pipeline.sadd(ACTIVE_USERS_KEY, userId);
    pipeline.expire(ACTIVE_USERS_KEY, ACTIVE_USERS_TTL);
    await pipeline.exec();
  } catch {
    // Silently fail
  }
}

// ============================================================================
// Public API — all fire-and-forget (void return, no await required)
// ============================================================================

/**
 * Track a per-user abuse metric.
 * Also registers the user in the active-users set.
 */
export function trackUserMetric(userId: string, metric: UserMetricName): void {
  void safeIncrement(userMetricKey(userId, metric), USER_WINDOW_TTL);
  void safeAddActiveUser(userId);
}

/**
 * Track a system-wide abuse metric (current-minute bucket).
 */
export function trackSystemMetric(metric: SystemMetricName): void {
  void safeIncrement(systemMinuteKey(metric), SYSTEM_MINUTE_TTL);
}

/**
 * Convenience: track a user write action AND bump system total_writes.
 */
export function trackWriteAction(userId: string, metric: UserMetricName): void {
  trackUserMetric(userId, metric);
  trackSystemMetric('total_writes');
}

/**
 * Convenience: track an HTTP error code.
 * - 402 / 403: tracked per-user (if userId available) AND system-wide.
 * - 429: tracked system-wide only (userId rarely available at middleware level).
 */
export function trackError(
  errorCode: '402' | '403' | '429',
  userId?: string,
): void {
  const systemMetric = `errors.${errorCode}` as SystemMetricName;
  trackSystemMetric(systemMetric);

  if (userId && (errorCode === '402' || errorCode === '403')) {
    trackUserMetric(userId, `errors.${errorCode}` as UserMetricName);
  }
}
