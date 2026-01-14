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

/**
 * Get a join request by ID.
 */
export async function getJoinRequestById(
  requestId: string
): Promise<DbClubJoinRequest | null> {
  const db = getAdminDb();

  const { data, error } = await (db as any)
    .from('club_join_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    log.error('Error fetching join request by ID', { error, requestId });
    throw new Error('Failed to fetch join request');
  }

  return data;
}

/**
 * List pending join requests for a club.
 * Per SSOT_CLUBS_DOMAIN.md §5.3: Used by owner to view incoming requests.
 */
export async function listPendingJoinRequests(
  clubId: string
): Promise<DbClubJoinRequest[]> {
  const db = getAdminDb();

  const { data, error } = await (db as any)
    .from('club_join_requests')
    .select('*')
    .eq('club_id', clubId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Error listing pending join requests', { error, clubId });
    throw new Error('Failed to list pending join requests');
  }

  return data ?? [];
}

/**
 * List pending join requests with user data (for display).
 */
export async function listPendingJoinRequestsWithUser(
  clubId: string
): Promise<(DbClubJoinRequest & { user: { id: string; name: string; telegram_handle: string | null; avatar_url: string | null } })[]> {
  const db = getAdminDb();

  const { data, error } = await (db as any)
    .from('club_join_requests')
    .select('*, user:users!requester_user_id(id, name, telegram_handle, avatar_url)')
    .eq('club_id', clubId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Error listing pending join requests with user', { error, clubId });
    throw new Error('Failed to list pending join requests');
  }

  return data ?? [];
}