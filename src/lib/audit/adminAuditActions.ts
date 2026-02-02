/**
 * Admin Audit Action Codes (Canonical)
 * 
 * This module defines the closed set of admin audit action codes.
 * Per SSOT_ADMIN_AUDIT_RULES v1.0 §4: "No free-form action names are allowed."
 * 
 * @see SSOT_ADMIN_AUDIT_RULES v1.0 §4
 * @see SSOT_ADMIN_DOMAIN v1.0 §7
 * 
 * RULES:
 * - All admin actions MUST use predefined action codes from this file
 * - Free-form strings are FORBIDDEN
 * - Do NOT reuse club audit enums (separate concerns)
 * - No billing logic in this file
 * 
 * VERSIONING:
 * - v1.0: Initial Admin V0 action codes
 */

/**
 * Admin Audit Action Codes — Closed Union Type
 * 
 * SSOT_ADMIN_AUDIT_RULES v1.0 §4.1–§4.2
 * 
 * This is a closed union — no other values are valid.
 * Adding new codes requires SSOT version bump.
 */
export type AdminAuditActionCode =
  // Billing-related success actions (§4.1)
  | 'ADMIN_GRANT_CREDIT'
  | 'ADMIN_EXTEND_SUBSCRIPTION'
  // Failure actions (§4.2)
  | 'ADMIN_GRANT_CREDIT_REJECTED'
  | 'ADMIN_EXTEND_SUBSCRIPTION_REJECTED';

/**
 * Admin Audit Action Code enum for runtime validation
 * 
 * Use this when you need to validate action codes at runtime
 * or iterate over valid codes.
 */
export const AdminAuditActionCodes = {
  // Success actions
  ADMIN_GRANT_CREDIT: 'ADMIN_GRANT_CREDIT',
  ADMIN_EXTEND_SUBSCRIPTION: 'ADMIN_EXTEND_SUBSCRIPTION',
  // Failure actions
  ADMIN_GRANT_CREDIT_REJECTED: 'ADMIN_GRANT_CREDIT_REJECTED',
  ADMIN_EXTEND_SUBSCRIPTION_REJECTED: 'ADMIN_EXTEND_SUBSCRIPTION_REJECTED',
} as const;

/**
 * Mapping of success actions to their corresponding rejection actions
 * 
 * Use this to derive the correct rejection code from a success code.
 */
export const AdminAuditRejectionMap: Record<
  Extract<AdminAuditActionCode, 'ADMIN_GRANT_CREDIT' | 'ADMIN_EXTEND_SUBSCRIPTION'>,
  Extract<AdminAuditActionCode, 'ADMIN_GRANT_CREDIT_REJECTED' | 'ADMIN_EXTEND_SUBSCRIPTION_REJECTED'>
> = {
  ADMIN_GRANT_CREDIT: 'ADMIN_GRANT_CREDIT_REJECTED',
  ADMIN_EXTEND_SUBSCRIPTION: 'ADMIN_EXTEND_SUBSCRIPTION_REJECTED',
};

/**
 * Type guard to check if a string is a valid AdminAuditActionCode
 */
export function isValidAdminAuditActionCode(code: string): code is AdminAuditActionCode {
  return Object.values(AdminAuditActionCodes).includes(code as AdminAuditActionCode);
}
