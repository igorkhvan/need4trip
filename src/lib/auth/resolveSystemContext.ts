/**
 * System Context Resolver
 * 
 * Canonical module for system/cron authentication.
 * Implements ADR-001.3 (System Context) - Phase 2
 * 
 * @see docs/adr/ADR-001.3.md
 * @see SSOT_ARCHITECTURE.md §8.3
 * @see SSOT_API.md §2.3.3
 * 
 * RULES (from ADR-001.3):
 * - System routes MUST NOT use resolveCurrentUser()
 * - System routes MUST NOT perform user-scoped mutations
 * - Direct header reading outside this module is FORBIDDEN for cron auth
 * - SystemContext is explicit and local to system routes
 * 
 * VERIFICATION PRECEDENCE (ADR-001.3 §5.2):
 * 1. If `x-vercel-cron` header is present and equals '1' → trusted (Vercel-injected)
 * 2. Else if `Authorization` header matches `Bearer <CRON_SECRET>` → trusted (secret-verified)
 * 3. Else → reject with 403
 */

import 'server-only';
import type { NextRequest } from 'next/server';
import { ForbiddenError } from '@/lib/errors';
import type { SystemContext } from './systemContext';

/**
 * Resolve SystemContext from request
 * 
 * Validates system access using either Vercel cron header or shared secret.
 * This is the ONLY place where system/cron authentication should occur.
 * 
 * @param request - NextRequest from route handler
 * @param jobName - Identifier for the job (e.g., 'process-notifications')
 * @returns SystemContext if valid
 * @throws ForbiddenError if authentication fails
 * 
 * SECURITY:
 * - Does NOT log secrets or Authorization header
 * - Does NOT access database
 * - Does NOT depend on middleware having run
 */
export function resolveSystemContext(
  request: NextRequest,
  jobName: string
): SystemContext {
  // Priority 1: Check for Vercel cron header (platform-injected, high trust)
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader === '1') {
    return {
      type: 'system',
      trigger: 'cron',
      verifiedBy: 'vercel-cron',
      jobName,
    };
  }

  // Priority 2: Check shared secret via Authorization header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET must be configured for manual triggers
  if (!cronSecret) {
    throw new ForbiddenError('System access denied: not configured');
  }

  // Validate Authorization header format: "Bearer <secret>"
  if (!authHeader) {
    throw new ForbiddenError('System access denied');
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new ForbiddenError('System access denied');
  }

  // Constant-time comparison would be ideal, but for this use case
  // simple comparison is acceptable (not protecting user passwords)
  if (token !== cronSecret) {
    throw new ForbiddenError('System access denied');
  }

  // Secret verified - this is a manual trigger
  return {
    type: 'system',
    trigger: 'manual',
    verifiedBy: 'secret',
    jobName,
  };
}
