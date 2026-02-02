/**
 * Admin Context Resolver
 * 
 * Canonical module for admin authentication.
 * Implements ADR-001.2 (Admin Context) - Phase 3 (User-based Admin Extension)
 * 
 * @see docs/adr/ADR-001.2.md
 * @see SSOT_ARCHITECTURE.md §8.3
 * @see SSOT_API.md §2.3.2
 * @see SSOT_ADMIN_AUDIT_RULES v1.0 §3.1
 * @see ADMIN_UI_CONTRACT v1.0
 * 
 * RULES (from ADR-001.2):
 * - Admin routes MUST NOT use resolveCurrentUser()
 * - Admin routes MUST NOT perform user-scoped mutations
 * - Direct header reading outside this module is FORBIDDEN
 * - AdminContext is explicit and local to admin routes
 * 
 * PHASE 3 CHANGES (User-based Admin Extension):
 * - Added support for browser-based Admin UI access via user session
 * - User-based admin determined by email allowlist (ADMIN_USER_EMAILS env)
 * - Two explicit auth paths: user-session (primary) and shared-secret (fallback)
 * - actorId for user-based admin = 'user:<userId>' for clear audit attribution
 * - Preserves full backward compatibility with secret-based access
 * 
 * SECURITY INVARIANTS:
 * - Admin UI does NOT own, store, inject, or proxy secrets
 * - User auth and admin auth remain distinct contexts
 * - No admin login UI, no admin JWTs, no new auth endpoints
 */

import 'server-only';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME } from '@/lib/auth/cookies';
import { verifyJwt } from '@/lib/auth/jwt';
import { getUserById } from '@/lib/db/userRepo';

/**
 * AdminContext - Phase 3 (SSOT_ADMIN_AUDIT_RULES v1.0 §3.1)
 * 
 * Represents an authenticated administrative actor with stable identity.
 * 
 * INVARIANTS:
 * - actorType is always 'admin' (not a user, not system)
 * - actorId is stable and non-null (required for audit attribution)
 * - For user-session: actorId = 'user:<userId>'
 * - For shared-secret: actorId = ADMIN_ACTOR_ID env or 'admin-default'
 */
export interface AdminContext {
  /** Discriminator for context type */
  readonly type: 'admin';
  
  /** Actor type for audit records */
  readonly actorType: 'admin';
  
  /** 
   * Stable admin identifier for audit attribution.
   * - For user-session: 'user:<userId>' (derived from authenticated user)
   * - For shared-secret: ADMIN_ACTOR_ID env or 'admin-default'
   * MUST be non-null and stable across requests.
   */
  readonly actorId: string;
  
  /** 
   * Authentication mechanism used:
   * - 'user-session': Browser-based access via cookie/JWT + email allowlist
   * - 'shared-secret': Machine/CLI access via x-admin-secret header
   */
  readonly authenticatedVia: 'user-session' | 'shared-secret';
}

/**
 * Default admin actor ID used when ADMIN_ACTOR_ID env is not set.
 * This provides a stable fallback for single-admin deployments.
 */
const DEFAULT_ADMIN_ACTOR_ID = 'admin-default';

/**
 * Parse admin user emails from environment variable.
 * @returns Set of lowercase emails that have admin access
 */
function getAdminUserEmails(): Set<string> {
  const envValue = process.env.ADMIN_USER_EMAILS;
  if (!envValue) {
    return new Set();
  }
  
  // Parse comma-separated emails, normalize to lowercase, filter empty
  return new Set(
    envValue
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  );
}

/**
 * Check if an email is in the admin allowlist.
 * @param email - User email to check
 * @returns true if email is allowed admin access
 */
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getAdminUserEmails();
  return allowlist.has(email.toLowerCase());
}

/**
 * Attempt to resolve AdminContext via user session (cookie/JWT).
 * 
 * This is the PRIMARY path for Admin UI browser access.
 * 
 * @returns AdminContext if valid admin user session, null otherwise
 * 
 * SECURITY:
 * - Uses existing session mechanism (no new auth endpoints)
 * - Email checked against server-side allowlist (client has no control)
 * - Does NOT call resolveCurrentUser() (per ADR-001.2)
 */
async function resolveUserBasedAdmin(): Promise<AdminContext | null> {
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
    
    // Verify JWT and extract userId
    const payload = await verifyJwt(token, secret);
    if (!payload?.userId) {
      return null;
    }
    
    // Load user to get email for allowlist check
    const user = await getUserById(String(payload.userId));
    if (!user) {
      return null;
    }
    
    // Check if user email is in admin allowlist
    if (!isAdminEmail(user.email)) {
      return null;
    }
    
    // User is authenticated AND in admin allowlist
    // Return AdminContext with user-derived actorId
    return {
      type: 'admin',
      actorType: 'admin',
      actorId: `user:${user.id}`,
      authenticatedVia: 'user-session',
    };
  } catch {
    // Session resolution failed - not an error, just no user-based admin
    return null;
  }
}

/**
 * Attempt to resolve AdminContext via shared secret header.
 * 
 * This is the FALLBACK path for machine/CLI/ops access.
 * 
 * @param request - NextRequest from route handler
 * @returns AdminContext if valid secret, null otherwise
 * 
 * SECURITY:
 * - Does NOT log secrets
 * - Does NOT access database
 */
function resolveSecretBasedAdmin(request: NextRequest): AdminContext | null {
  const adminSecret = request.headers.get('x-admin-secret');
  const envSecret = process.env.ADMIN_SECRET;
  
  // ADMIN_SECRET must be configured
  if (!envSecret) {
    return null;
  }
  
  // Validate shared secret
  if (!adminSecret || adminSecret !== envSecret) {
    return null;
  }
  
  // Derive stable admin actor ID
  const actorId = process.env.ADMIN_ACTOR_ID || DEFAULT_ADMIN_ACTOR_ID;
  
  return {
    type: 'admin',
    actorType: 'admin',
    actorId,
    authenticatedVia: 'shared-secret',
  };
}

/**
 * Resolve AdminContext from request
 * 
 * Validates admin access using two explicit paths:
 * 
 * A) User-based Admin (PRIMARY — for Admin UI):
 *    - Based on authenticated user session (cookie/JWT)
 *    - User email must be in ADMIN_USER_EMAILS allowlist
 *    - actorId derived from user identity: 'user:<userId>'
 *    - authenticatedVia = 'user-session'
 * 
 * B) Machine-based Admin (FALLBACK — ops only):
 *    - Based on x-admin-secret header
 *    - actorId = ADMIN_ACTOR_ID env or 'admin-default'
 *    - authenticatedVia = 'shared-secret'
 * 
 * Resolution order:
 * 1. Check user session + email allowlist (user-based admin)
 * 2. If no valid admin user → check x-admin-secret header
 * 3. Return null if neither path succeeds
 * 
 * @param request - NextRequest from route handler
 * @returns AdminContext if valid admin, null otherwise
 * 
 * SECURITY:
 * - Does NOT log secrets
 * - Admin UI does NOT inject secrets (uses session only)
 * - Allowlist is server-side only (client cannot bypass)
 * 
 * AUDIT:
 * - actorId is stable and traceable
 * - user-session: 'user:<userId>' (identifiable)
 * - shared-secret: configured ADMIN_ACTOR_ID (ops identity)
 */
export async function resolveAdminContext(request: NextRequest): Promise<AdminContext | null> {
  // PATH A: User-based Admin (PRIMARY — for Admin UI)
  // Prefer user-based admin when a valid admin user session exists
  const userBasedAdmin = await resolveUserBasedAdmin();
  if (userBasedAdmin) {
    return userBasedAdmin;
  }
  
  // PATH B: Machine-based Admin (FALLBACK — ops only)
  // Fallback to secret-based admin for non-browser usage
  return resolveSecretBasedAdmin(request);
}
