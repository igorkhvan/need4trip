import { getAdminDb } from './client';
import { ClubInvite, ClubInviteStatus } from '@/lib/types/club';
import { log } from '@/lib/utils/logger';

export type DbClubInvite = {
  id: string;
  club_id: string;
  invited_by_user_id: string;
  invitee_user_id: string;
  status: ClubInviteStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

/**
 * Creates a new club invite. Handles idempotency.
 * If a pending invite for the same user and club already exists, it refreshes the expiration and returns the existing invite.
 */
export async function createInvite(
  clubId: string,
  invitedByUserId: string,
  inviteeUserId: string
): Promise<DbClubInvite> {
  const db = getAdminDb();
  // TODO: The `as any` cast is a temporary workaround.
  // After the database schema is updated and Supabase types are regenerated,
  // 'create_club_invite' will be a valid RPC name and the cast can be removed.
  const { data, error } = await (db.rpc as any)('create_club_invite', {
    p_club_id: clubId,
    p_invited_by_user_id: invitedByUserId,
    p_invitee_user_id: inviteeUserId,
  });

  if (error) {
    log.error('Error creating club invite', { error });
    throw new Error('Failed to create club invite');
  }
  
  if (!data) {
    log.error('RPC create_club_invite returned no data');
    throw new Error('Failed to create or retrieve club invite');
  }

  return data;
}