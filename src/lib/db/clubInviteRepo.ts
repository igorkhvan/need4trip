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

  // Check for existing pending invite
  const { data: existing } = await (db as any)
    .from('club_invites')
    .select('*')
    .eq('club_id', clubId)
    .eq('invitee_user_id', inviteeUserId)
    .eq('status', 'pending')
    .single();

  if (existing) {
    // Refresh and return existing invite
    const { data: updated, error } = await (db as any)
      .from('club_invites')
      .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  // Create new invite
  const { data, error } = await (db as any)
    .from('club_invites')
    .insert({
      club_id: clubId,
      invited_by_user_id: invitedByUserId,
      invitee_user_id: inviteeUserId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}