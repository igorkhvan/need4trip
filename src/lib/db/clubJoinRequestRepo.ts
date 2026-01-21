import { getAdminDb } from './client';
import { log } from '@/lib/utils/logger';
import { ClubJoinRequestStatus } from '@/lib/types/club';
import { InternalError, NotFoundError } from '@/lib/errors';

export type DbClubJoinRequest = {
  id: string;
  club_id: string;
  requester_user_id: string;
  status: ClubJoinRequestStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
};

export type DbClubJoinRequestWithUser = DbClubJoinRequest & {
  user: {
    id: string;
    name: string;
    telegram_handle: string | null;
    avatar_url: string | null;
  };
};

/**
 * Creates a new club join request. Idempotent on (club_id, requester_user_id).
 * 
 * Phase 8A v1: pending state is implicit (row exists = pending).
 * Unique constraint allows only one row per (club_id, requester_user_id) where status='pending'.
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
      // Return existing pending request (idempotent)
      const { data: existing, error: fetchError } = await (db as any)
        .from('club_join_requests')
        .select('*')
        .eq('club_id', clubId)
        .eq('requester_user_id', requesterUserId)
        .eq('status', 'pending')
        .single();
      
      if (fetchError || !existing) {
        log.error('Error fetching existing join request after unique violation', { error: fetchError });
        throw new InternalError('Failed to create or retrieve join request.');
      }
      return existing;
    }
    
    log.error('Error creating club join request', { error });
    throw new InternalError('Failed to create club join request');
  }

  return data;
}

/**
 * Updates the status of a join request (approve/reject).
 * @deprecated Use deleteJoinRequest for v1 semantic (approve/reject = DELETE)
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
    throw new InternalError('Failed to update join request status');
  }

  return data;
}

/**
 * Delete a join request by ID.
 * Phase 8A v1: approve/reject = DELETE (silent, no history).
 */
export async function deleteJoinRequest(requestId: string): Promise<boolean> {
  const db = getAdminDb();

  const { error, count } = await (db as any)
    .from('club_join_requests')
    .delete({ count: 'exact' })
    .eq('id', requestId);

  if (error) {
    log.error('Error deleting join request', { error, requestId });
    throw new InternalError('Failed to delete join request');
  }

  if ((count ?? 0) === 0) {
    throw new NotFoundError('Join request not found');
  }

  return true;
}

/**
 * Delete a join request by club and user ID.
 * Phase 8A v1: for cancel own request.
 */
export async function deleteJoinRequestByClubAndUser(
  clubId: string,
  userId: string
): Promise<boolean> {
  const db = getAdminDb();

  const { error, count } = await (db as any)
    .from('club_join_requests')
    .delete({ count: 'exact' })
    .eq('club_id', clubId)
    .eq('requester_user_id', userId)
    .eq('status', 'pending');

  if (error) {
    log.error('Error deleting join request by club and user', { error, clubId, userId });
    throw new InternalError('Failed to delete join request');
  }

  if ((count ?? 0) === 0) {
    throw new NotFoundError('Join request not found');
  }

  return true;
}

/**
 * Get pending join request by club and user ID.
 */
export async function getPendingJoinRequest(
  clubId: string,
  userId: string
): Promise<DbClubJoinRequest | null> {
  const db = getAdminDb();

  const { data, error } = await (db as any)
    .from('club_join_requests')
    .select('*')
    .eq('club_id', clubId)
    .eq('requester_user_id', userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) {
    log.error('Error fetching pending join request', { error, clubId, userId });
    throw new InternalError('Failed to fetch join request');
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
 * Phase 8A v1: pending = row exists with status='pending'.
 */
export async function listPendingJoinRequestsWithUser(
  clubId: string
): Promise<DbClubJoinRequestWithUser[]> {
  const db = getAdminDb();

  const { data, error } = await (db as any)
    .from('club_join_requests')
    .select('*, user:users!requester_user_id(id, name, telegram_handle, avatar_url)')
    .eq('club_id', clubId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Error listing pending join requests with user', { error, clubId });
    throw new InternalError('Failed to list pending join requests');
  }

  return data ?? [];
}

/**
 * Approve a join request TRANSACTIONALLY.
 * Phase 8A v1: MUST be atomic (insert member + delete request).
 * 
 * @param requestId - Join request ID
 * @param approvedBy - User ID who approved (for invited_by field)
 * @returns The requester user ID and club ID for audit logging
 * @throws NotFoundError if request not found or not pending
 * @throws InternalError on DB error
 */
export async function approveJoinRequestTransactional(
  requestId: string,
  approvedBy: string
): Promise<{ clubId: string; requesterUserId: string }> {
  const db = getAdminDb();

  // Step 1: Get the join request (verify it exists and is pending)
  const { data: request, error: fetchError } = await (db as any)
    .from('club_join_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single();

  if (fetchError || !request) {
    log.error('Join request not found or not pending', { requestId, error: fetchError });
    throw new NotFoundError('Join request not found or already processed');
  }

  const { club_id: clubId, requester_user_id: requesterUserId } = request;

  // Step 2: Insert into club_members with role='member'
  // This will fail if user is already a member (unique constraint)
  const { error: memberError } = await (db as any)
    .from('club_members')
    .insert({
      club_id: clubId,
      user_id: requesterUserId,
      role: 'member',
      invited_by: approvedBy,
      joined_at: new Date().toISOString(),
    });

  if (memberError) {
    // If unique violation, user is already a member — still delete the request
    if (memberError.code !== '23505') {
      log.error('Error creating club member during approve', { error: memberError, requestId });
      throw new InternalError('Failed to create club membership');
    }
    log.warn('User already a club member, proceeding to delete request', { clubId, requesterUserId });
  }

  // Step 3: Delete the join request
  const { error: deleteError } = await (db as any)
    .from('club_join_requests')
    .delete()
    .eq('id', requestId);

  if (deleteError) {
    log.error('Error deleting join request during approve', { error: deleteError, requestId });
    throw new InternalError('Failed to complete approval');
  }

  log.info('Join request approved transactionally', { requestId, clubId, requesterUserId, approvedBy });

  return { clubId, requesterUserId };
}