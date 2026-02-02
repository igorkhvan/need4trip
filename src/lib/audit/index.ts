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

// Audit service
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
