/**
 * System Context Type
 * 
 * Represents authenticated system actors (cron jobs, background workers).
 * 
 * @see docs/adr/ADR-001.3.md §4.1
 * @see SSOT_ARCHITECTURE.md §8.3
 * 
 * RULES (from ADR-001.3):
 * - SystemContext is NOT a user (no userId, no session)
 * - System routes MUST NOT use resolveCurrentUser()
 * - System routes MUST NOT perform user-scoped mutations without explicit design
 */

/**
 * SystemContext - ADR-001.3 §4.1
 * 
 * Represents an authenticated system actor performing scheduled
 * or triggered operations.
 */
export interface SystemContext {
  /** Discriminator for context type */
  type: 'system';
  
  /** How the job was triggered */
  trigger: 'cron' | 'manual';
  
  /** Authentication mechanism used */
  verifiedBy: 'vercel-cron' | 'secret';
  
  /** Identifier for the specific job */
  jobName: string;
}

/**
 * Type guard for SystemContext
 */
export function isSystemContext(ctx: unknown): ctx is SystemContext {
  return (
    typeof ctx === 'object' &&
    ctx !== null &&
    (ctx as SystemContext).type === 'system' &&
    ['cron', 'manual'].includes((ctx as SystemContext).trigger) &&
    ['vercel-cron', 'secret'].includes((ctx as SystemContext).verifiedBy) &&
    typeof (ctx as SystemContext).jobName === 'string'
  );
}
