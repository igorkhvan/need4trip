/**
 * Beta Participant Limit Configuration (Client-Safe)
 *
 * During beta (SOFT_BETA_STRICT):
 * - Max 500 participants per event (UI enforcement)
 * - No club subscription paywall (clubs hidden)
 * - Modal shown instead of paywall for >500
 *
 * This module is intentionally client-safe (no `import 'server-only'`)
 * so it can be used in client components and tests.
 *
 * SSOT: docs/product/BETA_TEMPORARY_GATES_AND_DEVIATIONS.md §3.5
 * Copy: docs/ssot/SSOT_UI_COPY.md §7.4
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum participants allowed in beta mode.
 *
 * Matches the upgrade product limit (EVENT_UPGRADE_500.constraints.max_participants).
 * In HARD mode, >500 triggers CLUB_REQUIRED_FOR_LARGE_EVENT paywall.
 * In beta, clubs are hidden, so 500 is the hard cap enforced via UI modal.
 */
export const BETA_PARTICIPANT_LIMIT = 500;

// ============================================================================
// Canonical UI Copy (from SSOT_UI_COPY.md §7.4)
// ============================================================================

/**
 * Canonical UI copy for the beta participant limit modal.
 *
 * Source of truth: docs/ssot/SSOT_UI_COPY.md §7.4
 * Rules:
 * - NOT a paywall. No billing, pricing, upgrade, or club references.
 * - Single primary action (acknowledge).
 * - No secondary action.
 */
export const BETA_PARTICIPANT_LIMIT_COPY = {
  title: "Ограничение бета-версии",
  message: `В бета-версии максимальное количество участников события — ${BETA_PARTICIPANT_LIMIT}.`,
  primaryAction: "Понятно",
} as const;

// ============================================================================
// Logic
// ============================================================================

/**
 * Determine whether the beta participant limit modal should be shown.
 *
 * @param isBetaMode - Whether the app is in SOFT_BETA_STRICT mode
 * @param participantCount - The requested participant count
 * @returns true if modal should be shown (beta mode AND count > 500)
 */
export function shouldShowBetaParticipantLimitModal(
  isBetaMode: boolean,
  participantCount: number | null
): boolean {
  if (!isBetaMode) return false;
  if (participantCount === null) return false;
  return participantCount > BETA_PARTICIPANT_LIMIT;
}
