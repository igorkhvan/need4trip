/**
 * Admin Context Resolver
 * 
 * Canonical module for admin authentication.
 * Implements ADR-001.2 (Admin Context) - Phase 2
 * 
 * @see docs/adr/ADR-001.2.md
 * @see SSOT_ARCHITECTURE.md §8.3
 * @see SSOT_API.md §2.3.2
 * @see SSOT_ADMIN_AUDIT_RULES v1.0 §3.1
 * 
 * RULES (from ADR-001.2):
 * - Admin routes MUST NOT use resolveCurrentUser()
 * - Admin routes MUST NOT perform user-scoped mutations
 * - Direct header reading outside this module is FORBIDDEN
 * - AdminContext is explicit and local to admin routes
 * 
 * PHASE 2 CHANGES:
 * - Added stable `actorId` for audit attribution (GAP-1 resolution)
 * - actorId is derived from env ADMIN_ACTOR_ID or defaults to 'admin-default'
 */

import 'server-only';
import type { NextRequest } from 'next/server';

/**
 * AdminContext - Phase 2 (SSOT_ADMIN_AUDIT_RULES v1.0 §3.1)
 * 
 * Represents an authenticated administrative actor with stable identity.
 * 
 * INVARIANTS:
 * - actorType is always 'admin' (not a user, not system)
 * - actorId is stable and non-null (required for audit attribution)
 * - actorId MUST NOT be a user identifier
 */
export interface AdminContext {
  /** Discriminator for context type */
  readonly type: 'admin';
  
  /** Actor type for audit records */
  readonly actorType: 'admin';
  
  /** 
   * Stable admin identifier for audit attribution.
   * Derived from ADMIN_ACTOR_ID env var.
   * MUST be non-null and stable across requests.
   * MUST NOT be a user identifier.
   */
  readonly actorId: string;
  
  /** Authentication mechanism used */
  readonly authenticatedVia: 'shared-secret';
}

/**
 * Default admin actor ID used when ADMIN_ACTOR_ID env is not set.
 * This provides a stable fallback for single-admin deployments.
 */
const DEFAULT_ADMIN_ACTOR_ID = 'admin-default';

/**
 * Resolve AdminContext from request
 * 
 * Validates admin access using shared-secret mechanism.
 * This is the ONLY place where admin authentication should occur.
 * 
 * @param request - NextRequest from route handler
 * @returns AdminContext if valid, null otherwise
 * 
 * SECURITY:
 * - Does NOT log secrets
 * - Does NOT access database
 * - Does NOT depend on middleware having run
 * 
 * AUDIT:
 * - Returns stable actorId for audit attribution
 * - actorId is derived from ADMIN_ACTOR_ID env or defaults to 'admin-default'
 */
export function resolveAdminContext(request: NextRequest): AdminContext | null {
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
  // Can be customized via env for multi-admin scenarios (future)
  const actorId = process.env.ADMIN_ACTOR_ID || DEFAULT_ADMIN_ACTOR_ID;
  
  // Return AdminContext with full audit attribution (Phase 2)
  return {
    type: 'admin',
    actorType: 'admin',
    actorId,
    authenticatedVia: 'shared-secret',
  };
}
