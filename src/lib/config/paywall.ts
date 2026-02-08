/**
 * Paywall Mode Configuration (Server-Only)
 *
 * Defines the paywall enforcement mode for the application.
 *
 * Values:
 * - 'hard'              — Production behavior: paywall blocks, requires payment.
 * - 'soft_beta_strict'  — Beta behavior: paywall is shown, user confirms to continue
 *                          (system auto-grants + consumes credit).
 *
 * Default: 'hard' (production).
 *
 * SSOT: docs/ui-contracts/system/UX_CONTRACT_PAYWALL_SOFT_BETA_STRICT.md
 * Delta: docs/audits/BETA_SOFT_STRICT_DELTA_REPORT.md §5
 */

import 'server-only';

// ============================================================================
// Types
// ============================================================================

export const PAYWALL_MODES = ['hard', 'soft_beta_strict'] as const;
export type PaywallMode = typeof PAYWALL_MODES[number];

// ============================================================================
// Configuration Reader
// ============================================================================

/**
 * Get the current paywall mode from environment.
 *
 * Reads `PAYWALL_MODE` env var (server-only, no NEXT_PUBLIC_ prefix).
 * Falls back to 'hard' if not set or invalid.
 */
export function getPaywallMode(): PaywallMode {
  const raw = process.env.PAYWALL_MODE;

  if (!raw) return 'hard';

  const normalized = raw.trim().toLowerCase();

  if (PAYWALL_MODES.includes(normalized as PaywallMode)) {
    return normalized as PaywallMode;
  }

  // Invalid value — default to production behavior
  console.warn(
    `[paywall-config] Invalid PAYWALL_MODE="${raw}". ` +
    `Valid values: ${PAYWALL_MODES.join(', ')}. Defaulting to "hard".`
  );
  return 'hard';
}

/**
 * Check if paywall is in SOFT_BETA_STRICT mode.
 *
 * Convenience helper — use this in enforcement and UI branching.
 */
export function isSoftBetaStrict(): boolean {
  return getPaywallMode() === 'soft_beta_strict';
}
