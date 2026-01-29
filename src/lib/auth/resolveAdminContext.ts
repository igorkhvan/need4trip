/**
 * Admin Context Resolver
 * 
 * Canonical module for admin authentication.
 * Implements ADR-001.2 (Admin Context) - Phase 1
 * 
 * @see docs/adr/ADR-001.2.md
 * @see SSOT_ARCHITECTURE.md §8.3
 * @see SSOT_API.md §2.3.2
 * 
 * RULES (from ADR-001.2):
 * - Admin routes MUST NOT use resolveCurrentUser()
 * - Admin routes MUST NOT perform user-scoped mutations
 * - Direct header reading outside this module is FORBIDDEN
 * - AdminContext is explicit and local to admin routes
 */

import 'server-only';
import type { NextRequest } from 'next/server';

/**
 * AdminContext - Phase 1 (ADR-001.2 §4.1)
 * 
 * Represents an authenticated administrative actor.
 * Does NOT contain user identity (Phase 1 limitation).
 */
export interface AdminContext {
  /** Discriminator for context type */
  type: 'admin';
  /** Authentication mechanism used */
  authenticatedVia: 'shared-secret';
}

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
  
  // Return AdminContext (Phase 1)
  return {
    type: 'admin',
    authenticatedVia: 'shared-secret',
  };
}
