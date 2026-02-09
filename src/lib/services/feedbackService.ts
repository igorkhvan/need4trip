/**
 * Feedback Service — Submit & Admin Read
 *
 * Business logic for user feedback (ideas, bugs, general feedback).
 *
 * RULES (MANDATORY):
 * - No auth logic (caller is responsible for access control)
 * - No HTTP concerns (no Request/Response objects)
 * - Service owns validation, dedup, rate limiting (Redis), and DB insert
 *
 * Called from:
 * - POST /api/feedback (submit)
 * - GET /api/admin/feedback (admin read)
 * - RSC /admin/feedback page (admin read, per ADR-001.5)
 *
 * @see docs/ssot/SSOT_API.md — API-069, API-070
 * @see docs/ssot/SSOT_DATABASE.md — feedback table
 */

import 'server-only';

import { createHash } from 'crypto';
import { getAdminDb } from '@/lib/db/client';
import { getTelemetryRedis } from '@/lib/telemetry/redisClient';
import { log } from '@/lib/utils/logger';

// ============================================================================
// Types
// ============================================================================

export type FeedbackType = 'idea' | 'bug' | 'feedback';

export interface SubmitFeedbackPayload {
  type: FeedbackType;
  message: string;
  pagePath?: string;
  userAgent?: string;
}

export interface FeedbackRow {
  id: string;
  type: FeedbackType;
  message: string;
  userId: string;
  pagePath: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AdminFeedbackQuery {
  type?: FeedbackType;
  limit?: number;
  offset?: number;
}

export interface AdminFeedbackResult {
  items: FeedbackRow[];
  total: number;
}

// ============================================================================
// Validation result types
// ============================================================================

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'rate_limit' }
  | { ok: false; reason: 'validation'; detail: string }
  | { ok: false; reason: 'dedupe' };

// ============================================================================
// Constants
// ============================================================================

const FEEDBACK_TYPES: ReadonlySet<string> = new Set(['idea', 'bug', 'feedback']);
const MIN_MESSAGE_LENGTH = 20;
const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_TTL = 86400; // 24 hours in seconds
const DEDUPE_TTL = 86400; // 24 hours in seconds

// ============================================================================
// Validation helpers
// ============================================================================

/** Check if message is only URLs (one or more) */
function isOnlyUrls(text: string): boolean {
  const lines = text.trim().split(/\s+/);
  return lines.every(part => /^https?:\/\/\S+$/.test(part));
}

/** Check if message is only emoji (and whitespace) */
function isOnlyEmoji(text: string): boolean {
  // Remove all emoji, variation selectors, ZWJ, skin tones, and whitespace
  const stripped = text.replace(/[\p{Emoji_Presentation}\p{Emoji_Modifier_Base}\p{Emoji_Modifier}\p{Emoji_Component}\u200d\ufe0f\s]/gu, '');
  return stripped.length === 0;
}

/**
 * Validate feedback payload.
 * Returns null if valid, or error detail string if invalid.
 */
export function validateFeedbackPayload(payload: SubmitFeedbackPayload): string | null {
  // Type check
  if (!payload.type || !FEEDBACK_TYPES.has(payload.type)) {
    return 'type must be one of: idea, bug, feedback';
  }

  // Message presence
  if (!payload.message || typeof payload.message !== 'string') {
    return 'message is required';
  }

  const trimmed = payload.message.trim();

  // Empty after trim
  if (trimmed.length === 0) {
    return 'message must not be empty';
  }

  // Length bounds
  if (trimmed.length < MIN_MESSAGE_LENGTH) {
    return `message must be at least ${MIN_MESSAGE_LENGTH} characters`;
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return `message must be at most ${MAX_MESSAGE_LENGTH} characters`;
  }

  // Content quality checks
  if (isOnlyUrls(trimmed)) {
    return 'message must contain more than just URLs';
  }

  if (isOnlyEmoji(trimmed)) {
    return 'message must contain more than just emoji';
  }

  return null;
}

// ============================================================================
// Rate limiting (Redis-based, 3 per 24h per user)
// ============================================================================

/**
 * Check and increment user rate limit.
 * Returns true if within limit, false if exceeded.
 *
 * Graceful degradation: if Redis unavailable, allows the request.
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  try {
    const redis = getTelemetryRedis();
    if (!redis) return true; // graceful degradation

    const key = `feedback:user:${userId}`;
    const count = await redis.incr(key);

    // Set TTL only on first increment (when count becomes 1)
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_TTL);
    }

    return count <= RATE_LIMIT_MAX;
  } catch (err) {
    log.warn('feedbackService: rate limit check failed, allowing request', { userId, error: err });
    return true; // graceful degradation
  }
}

// ============================================================================
// Deduplication (Redis-based, sha256 hash, 24h TTL)
// ============================================================================

function computeDedupeHash(userId: string, message: string): string {
  return createHash('sha256').update(userId + message).digest('hex');
}

/**
 * Check if this feedback was already submitted (dedup).
 * Returns true if duplicate exists, false if new.
 *
 * Graceful degradation: if Redis unavailable, treats as non-duplicate.
 */
async function checkDedupe(userId: string, message: string): Promise<boolean> {
  try {
    const redis = getTelemetryRedis();
    if (!redis) return false; // graceful degradation

    const hash = computeDedupeHash(userId, message);
    const key = `feedback:dedupe:${hash}`;
    const exists = await redis.get(key);
    return exists !== null;
  } catch (err) {
    log.warn('feedbackService: dedupe check failed, treating as non-duplicate', { userId, error: err });
    return false; // graceful degradation
  }
}

/**
 * Mark feedback as submitted (set dedup key).
 * Fire-and-forget.
 */
async function setDedupeKey(userId: string, message: string): Promise<void> {
  try {
    const redis = getTelemetryRedis();
    if (!redis) return;

    const hash = computeDedupeHash(userId, message);
    const key = `feedback:dedupe:${hash}`;
    await redis.set(key, '1', { ex: DEDUPE_TTL });
  } catch {
    // silently fail — dedup is best-effort
  }
}

// ============================================================================
// Public API: submitFeedback
// ============================================================================

/**
 * Submit user feedback.
 *
 * Orchestrates: rate limit → validation → dedup → DB insert → dedup mark.
 *
 * @param userId - Authenticated user ID (caller must verify auth)
 * @param payload - Feedback payload
 * @returns SubmitResult
 */
export async function submitFeedback(
  userId: string,
  payload: SubmitFeedbackPayload,
): Promise<SubmitResult> {
  // 1. Rate limit check
  const withinLimit = await checkRateLimit(userId);
  if (!withinLimit) {
    return { ok: false, reason: 'rate_limit' };
  }

  // 2. Validation
  const validationError = validateFeedbackPayload(payload);
  if (validationError) {
    return { ok: false, reason: 'validation', detail: validationError };
  }

  const trimmedMessage = payload.message.trim();

  // 3. Deduplication check
  const isDuplicate = await checkDedupe(userId, trimmedMessage);
  if (isDuplicate) {
    return { ok: false, reason: 'dedupe' };
  }

  // 4. DB insert
  const db = getAdminDb();
  const { data, error } = await db
    .from('feedback')
    .insert({
      type: payload.type,
      message: trimmedMessage,
      user_id: userId,
      page_path: payload.pagePath ?? null,
      user_agent: payload.userAgent ?? null,
    })
    .select('id')
    .single();

  if (error) {
    log.error('feedbackService: insert failed', { error, userId });
    throw new Error('Failed to submit feedback');
  }

  // 5. Set dedup key (fire-and-forget)
  void setDedupeKey(userId, trimmedMessage);

  return { ok: true, id: data.id };
}

// ============================================================================
// Public API: getAdminFeedback
// ============================================================================

/**
 * Get feedback for admin dashboard.
 *
 * No auth logic — caller must verify admin access.
 *
 * @param query - Optional filters (type, limit, offset)
 * @returns AdminFeedbackResult
 */
export async function getAdminFeedback(
  query: AdminFeedbackQuery = {},
): Promise<AdminFeedbackResult> {
  const { type, limit = 50, offset = 0 } = query;

  const db = getAdminDb();

  // Count query (for total)
  let countQuery = db.from('feedback').select('*', { count: 'exact', head: true });
  if (type) {
    countQuery = countQuery.eq('type', type);
  }
  const { count } = await countQuery;

  // Data query
  let dataQuery = db
    .from('feedback')
    .select('id, type, message, user_id, page_path, user_agent, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) {
    dataQuery = dataQuery.eq('type', type);
  }

  const { data, error } = await dataQuery;

  if (error) {
    log.error('feedbackService: admin query failed', { error, query });
    throw new Error('Failed to fetch feedback');
  }

  const items: FeedbackRow[] = (data ?? []).map((row) => ({
    id: row.id,
    type: row.type as FeedbackType,
    message: row.message,
    userId: row.user_id,
    pagePath: row.page_path,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));

  return { items, total: count ?? 0 };
}
