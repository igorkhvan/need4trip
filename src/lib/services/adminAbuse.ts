/**
 * Admin Abuse Service — Read-Only Aggregation
 *
 * Service-layer functions for the Admin Abuse Dashboard.
 * Reads from Redis telemetry counters (no DB access).
 *
 * RULES (MANDATORY):
 * - No auth logic (caller is responsible for access control)
 * - No side effects / mutations
 * - No cookies / user context
 * - Read-only from Redis
 *
 * Called DIRECTLY from RSC pages (per ADR-001.5).
 * Also called from Admin HTTP API routes.
 *
 * @see docs/adr/active/ADR-001.5.md
 */

import 'server-only';

import { getTelemetryRedis } from '@/lib/telemetry/redisClient';
import {
  USER_METRICS,
  SYSTEM_METRICS,
  userMetricKey,
  ACTIVE_USERS_KEY,
  type UserMetricName,
  type SystemMetricName,
} from '@/lib/telemetry/abuseTelemetry';

// ============================================================================
// Types
// ============================================================================

export interface AbuseUserSummary {
  userId: string;
  metrics: Record<UserMetricName, number>;
  createThenDelete: number;
  score: number;
  status: 'normal' | 'watch' | 'suspicious';
}

export interface AbuseSystemOverview {
  timestamp: string;
  windowMinutes: number;
  systemMetrics: Record<SystemMetricName, number>;
  activeUserCount: number;
  topUsers: AbuseUserSummary[];
}

// ============================================================================
// Scoring (visual aid ONLY — no blocking or suspension)
// ============================================================================

/**
 * Compute a numeric score for sorting users by suspiciousness.
 * Weights are arbitrary and for display purposes only.
 */
function computeScore(metrics: Record<UserMetricName, number>): number {
  let score = 0;

  score += (metrics['events.create'] ?? 0) * 2;
  score += (metrics['events.update'] ?? 0) * 1;
  score += (metrics['events.delete'] ?? 0) * 3;
  score += (metrics['clubs.create'] ?? 0) * 5;
  score += (metrics['join_requests.create'] ?? 0) * 1;
  score += (metrics['club_audit_log.actions'] ?? 0) * 1;
  score += (metrics['errors.402'] ?? 0) * 3;
  score += (metrics['errors.403'] ?? 0) * 5;
  score += (metrics['ai.generate_rules'] ?? 0) * 2;

  return score;
}

function computeStatus(score: number): 'normal' | 'watch' | 'suspicious' {
  if (score >= 30) return 'suspicious';
  if (score >= 15) return 'watch';
  return 'normal';
}

// ============================================================================
// Internal readers
// ============================================================================

/** Zero-filled metric record (used when Redis is unavailable) */
function emptyUserMetrics(): Record<UserMetricName, number> {
  return Object.fromEntries(
    USER_METRICS.map((m) => [m, 0]),
  ) as Record<UserMetricName, number>;
}

function emptySystemMetrics(): Record<SystemMetricName, number> {
  return Object.fromEntries(
    SYSTEM_METRICS.map((m) => [m, 0]),
  ) as Record<SystemMetricName, number>;
}

/**
 * Read all per-user metrics for a given userId.
 */
async function readUserMetrics(
  userId: string,
): Promise<Record<UserMetricName, number>> {
  const redis = getTelemetryRedis();
  if (!redis) return emptyUserMetrics();

  try {
    const keys = USER_METRICS.map((m) => userMetricKey(userId, m));
    const values = await redis.mget<(number | null)[]>(...keys);

    const result: Record<string, number> = {};
    USER_METRICS.forEach((metric, i) => {
      result[metric] = values[i] ?? 0;
    });

    return result as Record<UserMetricName, number>;
  } catch {
    return emptyUserMetrics();
  }
}

/**
 * Read system-wide metrics for the current minute bucket.
 */
async function readSystemMetrics(): Promise<Record<SystemMetricName, number>> {
  const redis = getTelemetryRedis();
  if (!redis) return emptySystemMetrics();

  try {
    const bucket = Math.floor(Date.now() / 60000);
    const keys = SYSTEM_METRICS.map((m) => `abuse:sys:${m}:${bucket}`);
    const values = await redis.mget<(number | null)[]>(...keys);

    const result: Record<string, number> = {};
    SYSTEM_METRICS.forEach((metric, i) => {
      result[metric] = values[i] ?? 0;
    });

    return result as Record<SystemMetricName, number>;
  } catch {
    return emptySystemMetrics();
  }
}

/**
 * Get the set of user IDs that have had recent activity.
 */
async function readActiveUserIds(): Promise<string[]> {
  const redis = getTelemetryRedis();
  if (!redis) return [];

  try {
    const members = await redis.smembers(ACTIVE_USERS_KEY);
    return members;
  } catch {
    return [];
  }
}

/**
 * Build a summary for a single user.
 */
async function buildUserSummary(userId: string): Promise<AbuseUserSummary> {
  const metrics = await readUserMetrics(userId);

  const createThenDelete = Math.min(
    metrics['events.create'] ?? 0,
    metrics['events.delete'] ?? 0,
  );

  const score = computeScore(metrics);
  const status = computeStatus(score);

  return { userId, metrics, createThenDelete, score, status };
}

// ============================================================================
// Public service functions
// ============================================================================

/**
 * Get system-wide abuse overview + per-user summaries.
 *
 * Called directly from RSC (no auth logic here).
 */
export async function getAbuseOverview(): Promise<AbuseSystemOverview> {
  const [systemMetrics, activeUserIds] = await Promise.all([
    readSystemMetrics(),
    readActiveUserIds(),
  ]);

  const userSummaries = await Promise.all(
    activeUserIds.map(buildUserSummary),
  );

  // Sort by score descending (visual aid)
  userSummaries.sort((a, b) => b.score - a.score);

  return {
    timestamp: new Date().toISOString(),
    windowMinutes: 15,
    systemMetrics,
    activeUserCount: activeUserIds.length,
    topUsers: userSummaries,
  };
}

/**
 * Get per-user abuse summaries only.
 *
 * Called directly from RSC (no auth logic here).
 */
export async function getAbuseUsers(): Promise<AbuseUserSummary[]> {
  const activeUserIds = await readActiveUserIds();

  const userSummaries = await Promise.all(
    activeUserIds.map(buildUserSummary),
  );

  // Sort by score descending
  userSummaries.sort((a, b) => b.score - a.score);

  return userSummaries;
}
