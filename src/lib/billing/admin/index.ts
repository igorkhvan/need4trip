/**
 * Admin Billing Services
 * 
 * Canonical exports for admin billing operations.
 * 
 * @see SSOT_ADMIN_DOMAIN v1.0 §5 (Allowed Operations — GRANT)
 * @see SSOT_BILLING_ADMIN_RULES v1.0
 * @see SSOT_ADMIN_AUDIT_RULES v1.0
 * 
 * SCOPE:
 * - One-off credit grant (user context)
 * - Subscription extension (club context)
 * 
 * EXPLICITLY FORBIDDEN:
 * - Subscription lifecycle control (create, activate, cancel, upgrade/downgrade)
 * - Billing enforcement bypass
 * - Direct access grants
 */

// Admin billing services
export {
  adminGrantOneOffCredit,
  type AdminGrantCreditParams,
  type AdminGrantCreditResult,
} from './adminGrantOneOffCredit';

export {
  adminExtendSubscriptionExpiration,
  type AdminExtendSubscriptionParams,
  type AdminExtendSubscriptionResult,
} from './adminExtendSubscriptionExpiration';

// Forbidden operations guard
export {
  assertAdminBillingOperationAllowed,
  ForbiddenAdminBillingOperation,
  type ForbiddenAdminBillingOperationCode,
} from './forbiddenOperationsGuard';
