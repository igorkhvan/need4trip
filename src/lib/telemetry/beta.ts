/**
 * Beta Telemetry Events
 *
 * Non-audit telemetry for beta-specific flows.
 * Emits structured log events for analytics collection.
 *
 * MUST NOT use admin audit mechanisms.
 *
 * UX Contract: UX_CONTRACT_PAYWALL_SOFT_BETA_STRICT.md §10
 */

import { log } from '@/lib/utils/logger';

// ============================================================================
// Event Types
// ============================================================================

export const BETA_TELEMETRY_EVENTS = {
  // UI events (emitted by frontend via API or inline)
  PAYWALL_SHOWN_BETA: 'PAYWALL_SHOWN_BETA',
  PAYWALL_CONFIRMED_BETA: 'PAYWALL_CONFIRMED_BETA',
  PAYWALL_CANCELLED_BETA: 'PAYWALL_CANCELLED_BETA',

  // Backend events
  BETA_BILLING_AUTO_GRANT: 'BETA_BILLING_AUTO_GRANT',
  BETA_CREDIT_CONSUMED: 'BETA_CREDIT_CONSUMED',
} as const;

export type BetaTelemetryEvent = typeof BETA_TELEMETRY_EVENTS[keyof typeof BETA_TELEMETRY_EVENTS];

// ============================================================================
// Emit Functions (Server-Side)
// ============================================================================

/**
 * Emit a beta telemetry event (server-side structured log).
 *
 * This is a structured log call, NOT an admin audit entry.
 * Can be collected by log aggregation (e.g., Vercel Logs, Datadog).
 */
export function emitBetaTelemetry(
  event: BetaTelemetryEvent,
  data: Record<string, unknown>
): void {
  log.info(`[BETA_TELEMETRY] ${event}`, {
    telemetryEvent: event,
    telemetryScope: 'beta',
    ...data,
  });
}
