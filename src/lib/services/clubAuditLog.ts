import { appendAuditLog, AuditLogPayload } from '@/lib/db/clubAuditLogRepo';
import { log } from '@/lib/utils/logger';

/**
 * Service for handling club audit logging.
 * This provides a clean interface for other services to log canonical actions.
 */

// A simplified definition of the audit action codes from SSOT §9.1
export type ClubAuditAction =
  | 'CLUB_CREATED'
  | 'CLUB_UPDATED'
  | 'CLUB_VISIBILITY_CHANGED'
  | 'CLUB_ARCHIVED'
  | 'CLUB_UNARCHIVED'
  | 'INVITE_CREATED'
  | 'JOIN_REQUEST_APPROVED'
  | 'JOIN_REQUEST_REJECTED'
  | 'MEMBER_REMOVED'
  | 'ROLE_CHANGED';

type LogClubActionParams = {
  clubId: string;
  actorUserId: string;
  action: ClubAuditAction;
  targetUserId?: string;
  meta?: Record<string, any>;
};

export async function logClubAction({
  clubId,
  actorUserId,
  action,
  targetUserId,
  meta,
}: LogClubActionParams): Promise<void> {
  try {
    const payload: AuditLogPayload = {
      club_id: clubId,
      actor_user_id: actorUserId,
      action_code: action,
      target_user_id: targetUserId,
      meta: meta,
    };
    
    // Fire-and-forget. We don't want audit log failures to block the main operation.
    appendAuditLog(payload);

  } catch (error) {
    log.error('Failed to queue club audit log action', {
      error,
      clubId,
      actorUserId,
      action,
    });
  }
}