import { cookies } from "next/headers";

import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME } from "@/lib/auth/cookies";
import { getUserById } from "@/lib/db/userRepo";
import { ExperienceLevel, UserPlan } from "@/lib/types/user";
import { log } from "@/lib/utils/logger";
import { 
  verifyJwt, 
  signJwt, 
  decodeAuthToken as decodeAuthTokenAsync,
  createAuthToken as createAuthTokenAsync,
  type AuthPayload 
} from "@/lib/auth/jwt";

export interface CurrentUser {
  id: string;
  name?: string | null;
  telegramHandle?: string | null;
  telegramId?: string | null;
  avatarUrl?: string | null;
  cityId?: string | null; // FK на cities (normalized)
  phone?: string | null;
  email?: string | null;
  carBrandId?: string | null; // FK на car_brands (normalized)
  carModelText?: string | null; // Свободный текст модели
  experienceLevel?: ExperienceLevel | null;
  plan?: UserPlan; // Personal subscription plan (free | pro)
  availableCreditsCount?: number; // Count of available billing credits (for UI badge)
  createdAt?: string;
  updatedAt?: string;
}

const TOKEN_TTL_SECONDS = AUTH_COOKIE_MAX_AGE;

/**
 * Decode JWT token - async version for Edge Runtime compatibility
 */
export async function decodeAuthToken(token: string): Promise<AuthPayload | null> {
  return decodeAuthTokenAsync(token);
}

/**
 * Create JWT token - async version for Edge Runtime compatibility
 */
export async function createAuthToken(userId: string): Promise<string> {
  return createAuthTokenAsync(userId, TOKEN_TTL_SECONDS);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyJwt(token, secret);
  if (!payload?.userId) return null;

  let user: Awaited<ReturnType<typeof getUserById>> = null;
  try {
    user = await getUserById(String(payload.userId));
  } catch (err) {
    log.errorWithStack("Failed to load user from DB", err);
    return null;
  }

  if (!user) return null;

  // Get available credits count (non-blocking, fallback to 0 on error)
  let availableCreditsCount = 0;
  try {
    const { getAvailableCreditsCount } = await import("@/lib/db/userRepo");
    availableCreditsCount = await getAvailableCreditsCount(user.id);
  } catch (err) {
    log.warn("Failed to fetch available credits count for currentUser", { userId: user.id, error: err });
  }

  return {
    id: user.id,
    name: user.name,
    telegramHandle: user.telegramHandle,
    telegramId: user.telegramId ?? null,
    avatarUrl: user.avatarUrl,
    cityId: user.cityId ?? null, // FK на cities (normalized)
    phone: user.phone ?? null,
    email: user.email ?? null,
    carBrandId: user.carBrandId ?? null, // FK на car_brands (normalized)
    carModelText: user.carModelText ?? null, // Свободный текст модели
    experienceLevel: user.experienceLevel ?? null,
    plan: user.plan ?? "free", // Personal subscription plan
    availableCreditsCount, // ⚡ Credits count for UI badge
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getCurrentUserSafe(): Promise<CurrentUser | null> {
  try {
    return await getCurrentUser();
  } catch (err) {
    log.errorWithStack("Failed to resolve current user", err);
    return null;
  }
}

/**
 * Get CurrentUser from middleware x-user-id header
 * 
 * Use this in API route handlers that are protected by middleware.
 * Middleware validates JWT and adds x-user-id header.
 * 
 * @param request - Request object from route handler
 * @returns CurrentUser object or null
 * 
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const user = await getCurrentUserFromMiddleware(request);
 *   if (!user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   // Use user...
 * }
 * ```
 */
export async function getCurrentUserFromMiddleware(request: Request): Promise<CurrentUser | null> {
  const userId = request.headers.get('x-user-id');
  
  if (!userId) {
    log.warn("getCurrentUserFromMiddleware called without x-user-id header");
    return null;
  }
  
  try {
    const user = await getUserById(userId);
    if (!user) {
      log.error("User not found after middleware auth", { userId });
      return null;
    }
    
    // Get available credits count (non-blocking, fallback to 0 on error)
    let availableCreditsCount = 0;
    try {
      const { getAvailableCreditsCount } = await import("@/lib/db/userRepo");
      availableCreditsCount = await getAvailableCreditsCount(user.id);
    } catch (err) {
      log.warn("Failed to fetch available credits count for currentUser", { userId: user.id, error: err });
    }
    
    // Convert User to CurrentUser format
    return {
      id: user.id,
      name: user.name,
      telegramHandle: user.telegramHandle,
      telegramId: user.telegramId,
      avatarUrl: user.avatarUrl,
      cityId: user.cityId,
      phone: user.phone,
      email: user.email,
      carBrandId: user.carBrandId,
      carModelText: user.carModelText,
      experienceLevel: user.experienceLevel,
      plan: user.plan,
      availableCreditsCount, // ⚡ Credits count for UI badge
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  } catch (err) {
    log.errorWithStack("Failed to load user from middleware ID", err, { userId });
    return null;
  }
}

/**
 * Get CurrentUser with fallback strategy (recommended for API routes)
 * 
 * Tries middleware first (fast, edge-compatible), falls back to cookie check.
 * Use this in protected routes where middleware headers might not propagate correctly
 * (e.g., Safari, some proxy configurations).
 * 
 * Strategy:
 * 1. Try getCurrentUserFromMiddleware() - fast, uses x-user-id header from middleware
 * 2. Fallback to getCurrentUser() - reads cookie directly, works in all browsers
 * 
 * @param request - Request object from route handler
 * @returns CurrentUser object or null
 * 
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const user = await getCurrentUserWithFallback(request);
 *   if (!user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *   // Use user...
 * }
 * ```
 */
export async function getCurrentUserWithFallback(request: Request): Promise<CurrentUser | null> {
  // Try middleware first (fast path)
  let user = await getCurrentUserFromMiddleware(request);
  
  if (user) {
    return user;
  }
  
  // Fallback to direct cookie check
  // This handles edge cases where middleware headers don't propagate
  log.info("getCurrentUserWithFallback: middleware header missing, trying cookie fallback");
  user = await getCurrentUser();
  
  if (!user) {
    log.warn("getCurrentUserWithFallback: both middleware and cookie auth failed");
  }
  
  return user;
}
