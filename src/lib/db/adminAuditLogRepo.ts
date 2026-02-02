/**
 * Admin Audit Log Repository
 * 
 * Database operations for admin_audit_log table.
 * This is an append-only table — no update or delete operations.
 * 
 * @see SSOT_ADMIN_AUDIT_RULES v1.0 §3 (Audit Record Structure)
 * @see SSOT_ADMIN_AUDIT_RULES v1.0 §1.2 (Immutability)
 * 
 * RULES:
 * - Append-only: no UPDATE or DELETE operations
 * - Records are retained indefinitely (§7.1)
 * - MUST throw on failure (no fire-and-forget)
 */

import 'server-only';
import { getAdminDb } from './client';
import type { AdminAuditActionCode } from '@/lib/audit/adminAuditActions';
import type { Json } from './types';

// =============================================================================
// Types
// =============================================================================

/**
 * Audit result as stored in database
 */
export type AdminAuditResult = 'success' | 'rejected';

/**
 * Target type for admin actions
 */
export type AdminAuditTargetType = 'user' | 'club';

/**
 * Payload for creating an admin audit record
 * 
 * Matches SSOT_ADMIN_AUDIT_RULES v1.0 §3.1 (Mandatory Fields)
 */
export interface AdminAuditRecordInput {
  // Actor attribution (§3.1)
  actorId: string;
  
  // Action (§3.1)
  actionType: AdminAuditActionCode;
  
  // Target (§3.1)
  targetType: AdminAuditTargetType;
  targetId: string;
  
  // Justification (§3.1 - MANDATORY)
  reason: string;
  
  // Result (§3.1)
  result: AdminAuditResult;
  
  // Optional fields (§3.2)
  metadata?: Record<string, unknown>;
  relatedEntityId?: string;
  errorCode?: string;
}

/**
 * Admin audit record as returned from database
 */
export interface AdminAuditRecord {
  id: number;
  actorType: 'admin';
  actorId: string;
  actionType: AdminAuditActionCode;
  targetType: AdminAuditTargetType;
  targetId: string;
  reason: string;
  result: AdminAuditResult;
  metadata: Record<string, unknown> | null;
  relatedEntityId: string | null;
  errorCode: string | null;
  createdAt: string;
}

// =============================================================================
// Database row type
// =============================================================================

interface DbAdminAuditRow {
  id: number;
  actor_type: string;
  actor_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  reason: string;
  result: string;
  metadata: Record<string, unknown> | null;
  related_entity_id: string | null;
  error_code: string | null;
  created_at: string;
}

// =============================================================================
// Mapper
// =============================================================================

function mapDbRowToRecord(row: DbAdminAuditRow): AdminAuditRecord {
  return {
    id: row.id,
    actorType: row.actor_type as 'admin',
    actorId: row.actor_id,
    actionType: row.action_type as AdminAuditActionCode,
    targetType: row.target_type as AdminAuditTargetType,
    targetId: row.target_id,
    reason: row.reason,
    result: row.result as AdminAuditResult,
    metadata: row.metadata,
    relatedEntityId: row.related_entity_id,
    errorCode: row.error_code,
    createdAt: row.created_at,
  };
}

// =============================================================================
// Repository Functions
// =============================================================================

/**
 * Append an admin audit record
 * 
 * This is the ONLY write operation for this table.
 * Per SSOT_ADMIN_AUDIT_RULES v1.0 §1.2: records are immutable after creation.
 * 
 * CRITICAL: This function THROWS on failure.
 * Unlike club audit log, admin audit MUST NOT be fire-and-forget.
 * 
 * @param input - Audit record data
 * @returns Created audit record with id and timestamp
 * @throws Error if insert fails
 */
export async function appendAdminAuditRecord(
  input: AdminAuditRecordInput
): Promise<AdminAuditRecord> {
  const db = getAdminDb();
  
  // Validate reason is not empty (defense in depth, DB also validates)
  if (!input.reason || input.reason.trim().length === 0) {
    throw new Error('Admin audit record MUST have a non-empty reason');
  }
  
  const dbPayload = {
    actor_type: 'admin' as const,
    actor_id: input.actorId,
    action_type: input.actionType,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    result: input.result,
    metadata: (input.metadata as Json) ?? null,
    related_entity_id: input.relatedEntityId ?? null,
    error_code: input.errorCode ?? null,
  };
  
  const { data, error } = await db
    .from('admin_audit_log')
    .insert(dbPayload)
    .select('*')
    .single();
  
  if (error || !data) {
    // CRITICAL: Throw on failure — admin audit is mandatory
    throw new Error(`Failed to append admin audit record: ${error?.message ?? 'Unknown error'}`);
  }
  
  return mapDbRowToRecord(data as DbAdminAuditRow);
}

/**
 * Get admin audit records by target
 * 
 * Use for viewing audit history for a specific user or club.
 * 
 * @param targetType - 'user' or 'club'
 * @param targetId - UUID of the target entity
 * @param limit - Maximum number of records (default 100)
 * @returns Array of audit records, newest first
 */
export async function getAdminAuditByTarget(
  targetType: AdminAuditTargetType,
  targetId: string,
  limit = 100
): Promise<AdminAuditRecord[]> {
  const db = getAdminDb();
  
  const { data, error } = await db
    .from('admin_audit_log')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    throw new Error(`Failed to fetch admin audit records: ${error.message}`);
  }
  
  return (data ?? []).map((row) => mapDbRowToRecord(row as DbAdminAuditRow));
}

/**
 * Get admin audit records by actor
 * 
 * Use for viewing all actions performed by a specific admin.
 * 
 * @param actorId - Admin actor ID
 * @param limit - Maximum number of records (default 100)
 * @returns Array of audit records, newest first
 */
export async function getAdminAuditByActor(
  actorId: string,
  limit = 100
): Promise<AdminAuditRecord[]> {
  const db = getAdminDb();
  
  const { data, error } = await db
    .from('admin_audit_log')
    .select('*')
    .eq('actor_id', actorId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    throw new Error(`Failed to fetch admin audit records: ${error.message}`);
  }
  
  return (data ?? []).map((row) => mapDbRowToRecord(row as DbAdminAuditRow));
}

/**
 * Get recent admin audit records
 * 
 * Use for admin audit log UI listing.
 * 
 * @param limit - Maximum number of records (default 100)
 * @returns Array of audit records, newest first
 */
export async function getRecentAdminAuditRecords(
  limit = 100
): Promise<AdminAuditRecord[]> {
  const db = getAdminDb();
  
  const { data, error } = await db
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    throw new Error(`Failed to fetch admin audit records: ${error.message}`);
  }
  
  return (data ?? []).map((row) => mapDbRowToRecord(row as DbAdminAuditRow));
}
