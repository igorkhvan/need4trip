import { getAdminDb } from './client';
import { log } from '@/lib/utils/logger';
import { ClubJoinRequestStatus } from '@/lib/types/club';

export type DbClubJoinRequest = {
  id: string;
  club_id: string;
  requester_user_id: string;
  status: ClubJoinRequestStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Creates a new club join request. Idempotent on (club_id, requester_user_id).
 */
export async function createJoinRequest(
  clubId: string,
  requesterUserId: string,
  message?: string
): Promise<DbClubJoinRequest> {
  const db = getAdminDb();

  const { data, error } = await (db as any)
    .from('club_join_requests')
    .insert({
      club_id: clubId,
      requester_user_id: requesterUserId,
      message: message,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation for idempotency
    if (error.code === '23505') { // unique_violation
      const { data: existing, error: fetchError } = await (db as any)
        .from('club_join_requests')
        .select('*')
        .eq('club_id', clubId)
        .eq('requester_user_id', requesterUserId)
        .eq('status', 'pending')
        .single();
      
      if (fetchError || !existing) {
        log.error('Error fetching existing join request after unique violation', { error: fetchError });
        throw new Error('Failed to create or retrieve join request.');
      }
      return existing;
    }
    
    log.error('Error creating club join request', { error });
    throw new Error('Failed to create club join request');
  }

  return data;
}

/**
 * Updates the status of a join request (approve/reject).
 */
export async function updateJoinRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected'
): Promise<DbClubJoinRequest> {
  const db = getAdminDb();

  const { data, error } = await (db as any)
    .from('club_join_requests')
    .update({ status: status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();

  if (error) {
    log.error('Error updating join request status', { error, requestId, status });
    throw new Error('Failed to update join request status');
  }

  return data;
}