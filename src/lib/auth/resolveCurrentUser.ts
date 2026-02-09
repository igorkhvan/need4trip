/**
 * Canonical Auth Resolver
 * 
 * Single source of truth for resolving the current user across all server contexts:
 * - API routes (with Request object)
 * - RSC / Server Components (without Request object)
 * 
 * Transport-agnostic fallback chain:
 * 1. If Request exists AND x-user-id header present → load user by ID (middleware-injected)
 * 2. Else fallback to cookie-based session (direct JWT verification)
 * 3. Else return null
 * 
 * Usage:
 * ```typescript
 * // In API route handlers:
 * const user = await resolveCurrentUser(req);
 * 
 * // In RSC / Server Components (no request):
 * const user = await resolveCurrentUser();
 * ```
 * 
 * @see docs/adr/ADR-001.md - Auth Resolution Architecture Decision
 * @see docs/architectural-debt/CLUBS_AUTH_RESOLUTION_ANALYSIS.md
 */
import 'server-only';

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { getUserById, getAvailableCreditsCount } from "@/lib/db/userRepo";
import { verifyJwt } from "@/lib/auth/jwt";
import { log } from "@/lib/utils/logger";
import { assertNotSuspended, UserSuspendedError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/auth/currentUser";

/**
 * Resolve current user with deterministic fallback chain.
 * 
 * Fallback order:
 * 1. Request x-user-id header (set by middleware for protected routes)
 * 2. Cookie-based JWT verification (for RSC and public routes)
 * 3. null
 * 
 * @param req - Optional Request object (present in API route handlers)
 * @returns CurrentUser or null
 */
export async function resolveCurrentUser(req?: Request): Promise<CurrentUser | null> {
  // Strategy 1: x-user-id header from middleware (fast path for API routes)
  if (req) {
    const userId = req.headers.get('x-user-id');
    if (userId) {
      return loadUserById(userId, 'middleware-header');
    }
  }

  // Strategy 2: Cookie-based JWT verification (RSC fallback)
  return resolveFromCookie();
}

/**
 * Load user by ID and return CurrentUser format.
 * Reuses existing getUserById logic.
 * 
 * @internal
 */
async function loadUserById(userId: string, source: string): Promise<CurrentUser | null> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      log.warn("resolveCurrentUser: User not found", { userId, source });
      return null;
    }

    // Enforcement: suspended users cannot proceed
    assertNotSuspended(user);

    // Get available credits count (non-blocking, fallback to 0 on error)
    let availableCreditsCount = 0;
    try {
      availableCreditsCount = await getAvailableCreditsCount(user.id);
    } catch (err) {
      log.warn("resolveCurrentUser: Failed to fetch credits count", { userId: user.id, error: err });
    }

    return {
      id: user.id,
      name: user.name,
      telegramHandle: user.telegramHandle,
      telegramId: user.telegramId ?? null,
      avatarUrl: user.avatarUrl,
      cityId: user.cityId ?? null,
      phone: user.phone ?? null,
      email: user.email ?? null,
      carBrandId: user.carBrandId ?? null,
      carModelText: user.carModelText ?? null,
      experienceLevel: user.experienceLevel ?? null,
      plan: user.plan ?? "free",
      availableCreditsCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (err) {
    // Re-throw UserSuspendedError — must not be swallowed
    if (err instanceof UserSuspendedError) throw err;
    log.errorWithStack("resolveCurrentUser: Failed to load user", err, { userId, source });
    return null;
  }
}

/**
 * Resolve user from cookie-based JWT.
 * Used as fallback when x-user-id header is not present.
 * 
 * @internal
 */
async function resolveFromCookie(): Promise<CurrentUser | null> {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    return null;
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }

    const payload = await verifyJwt(token, secret);
    if (!payload?.userId) {
      return null;
    }

    return loadUserById(String(payload.userId), 'cookie');
  } catch (err) {
    log.errorWithStack("resolveCurrentUser: Cookie resolution failed", err);
    return null;
  }
}
