import { getAdminDb } from './client';
import { log } from '@/lib/utils/logger';

export type AuditLogPayload = {
  club_id: string;
  actor_user_id: string;
  action_code: string;
  target_user_id?: string;
  target_entity_type?: string;
  target_entity_id?: string;
  meta?: Record<string, any>;
};

/**
 * Inserts a new entry into the club audit log.
 * This is an append-only operation.
 */
export async function appendAuditLog(payload: AuditLogPayload): Promise<void> {
  const db = getAdminDb();

  const { error } = await (db as any)
    .from('club_audit_log')
    .insert(payload);

  if (error) {
    log.error('Failed to append to club audit log', { error, payload });
    // We don't throw an error here, as audit logging failure should not
    // block the primary user action. We just log it for later inspection.
  }
}