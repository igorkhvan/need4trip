/**
 * Admin Audit Module
 * 
 * Canonical exports for admin audit functionality.
 * 
 * @see SSOT_ADMIN_AUDIT_RULES v1.0
 */

// Action codes
export {
  type AdminAuditActionCode,
  AdminAuditActionCodes,
  AdminAuditRejectionMap,
  isValidAdminAuditActionCode,
} from './adminAuditActions';

// Audit service (non-atomic)
export {
  logAdminAction,
  logAdminSuccess,
  logAdminRejection,
  type LogAdminActionParams,
  type LogAdminSuccessParams,
  type LogAdminRejectedParams,
  type AdminAuditResult,
  type AdminAuditTargetType,
  type AdminAuditRecord,
} from './adminAuditLog';

// Atomic mutations (SSOT_ADMIN_AUDIT_RULES v1.0 §5.1)
export {
  adminAtomicMutation,
  logAdminValidationRejection,
  type AdminAtomicMutationParams,
  type AdminAtomicMutationResult,
  type AdminMutationTarget,
  type MutationResult,
  type RollbackContext,
} from './adminAtomic';
