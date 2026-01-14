/**
 * API: /api/clubs/[id]/members/preview
 * 
 * GET - Public members preview (limited fields and count)
 * 
 * Per SSOT_CLUBS_DOMAIN.md §8.4.1: public_members_list_enabled flag.
 * Per SSOT_CLUBS_DOMAIN.md §8.4.3: Guest-Visible Member Fields (displayName, avatar only).
 * Per SSOT_CLUBS_DOMAIN.md §10.4: Data minimization.
 * 
 * This endpoint is safe for unauthenticated access when:
 * - Club visibility = 'public'
 * - clubs.settings.public_members_list_enabled = true
 * 
 * For authenticated users who are club members, returns full preview.
 */

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getClubById } from "@/lib/db/clubRepo";
import { getMember, listMembersWithUser, countMembers } from "@/lib/db/clubMemberRepo";
import { respondSuccess, respondError } from "@/lib/api/response";
import { log } from "@/lib/utils/logger";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Maximum number of members to return in preview
const PREVIEW_LIMIT = 6;

// Public member preview shape (minimal fields per SSOT_CLUBS_DOMAIN.md §8.4.3)
interface PublicMemberPreview {
  displayName: string;
  avatarUrl: string | null;
  isOwner?: boolean; // Only if public_show_owner_badge is enabled
}

// Extended member preview for authenticated members (includes role)
interface MemberPreview extends PublicMemberPreview {
  userId: string;
  role: string;
}

/**
 * GET /api/clubs/[id]/members/preview
 * Public preview of club members.
 * 
 * Per SSOT_CLUBS_DOMAIN.md §10.4:
 * - Default: Guests cannot access members list
 * - Exception: Guest access allowed ONLY when ALL conditions met:
 *   1. Club visibility = 'public'
 *   2. clubs.settings.public_members_list_enabled = true
 *   3. Fields exposed are limited to §8.4.3 (displayName, avatar)
 * 
 * Per SSOT_CLUBS_DOMAIN.md §8.4.2:
 * - Owner badge shown only if public_show_owner_badge = true
 * 
 * Response:
 * - members: Array of member previews (limited count)
 * - totalCount: Total number of members
 * - hasMore: Whether there are more members than preview limit
 * 
 * Responses:
 * - 200: Members preview returned
 * - 403: Private club / public_members_list_enabled = false (for guests)
 * - 404: Club not found
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id: clubId } = await params;
    
    // Get current user (optional - may be null for guests)
    const user = await getCurrentUser();
    
    // 404: Check club exists
    const club = await getClubById(clubId);
    if (!club) {
      throw new NotFoundError("Клуб не найден");
    }
    
    // Check if user is a member (excluding pending)
    const membership = user ? await getMember(clubId, user.id) : null;
    const isMember = membership && membership.role !== "pending";
    
    // Get settings from club
    const settings = club.settings || {};
    const publicMembersListEnabled = settings.public_members_list_enabled === true;
    const publicShowOwnerBadge = settings.public_show_owner_badge === true;
    
    // Authorization check for guests/non-members
    if (!isMember) {
      // Per SSOT_CLUBS_DOMAIN.md §10.4:
      // - Private clubs: guests cannot view members list regardless of settings
      // - Public clubs: only if public_members_list_enabled = true
      
      if (club.visibility === "private") {
        throw new ForbiddenError("Список участников недоступен для закрытых клубов");
      }
      
      if (!publicMembersListEnabled) {
        throw new ForbiddenError("Просмотр списка участников отключен для этого клуба");
      }
    }
    
    // Get total count
    const totalCount = await countMembers(clubId);
    
    // Get members with user info
    const allMembers = await listMembersWithUser(clubId);
    
    // Filter out pending members and limit to preview
    const activeMembers = allMembers.filter(m => m.role !== "pending");
    const previewMembers = activeMembers.slice(0, PREVIEW_LIMIT);
    
    // Map to preview shape based on access level
    let members: (PublicMemberPreview | MemberPreview)[];
    
    if (isMember) {
      // Authenticated member: return extended preview with userId and role
      members = previewMembers.map(m => ({
        userId: m.user_id,
        displayName: m.user.name,
        avatarUrl: m.user.avatar_url,
        role: m.role,
        isOwner: m.role === "owner",
      }));
    } else {
      // Guest/non-member: return minimal preview per SSOT_CLUBS_DOMAIN.md §8.4.3
      members = previewMembers.map(m => {
        const preview: PublicMemberPreview = {
          displayName: m.user.name,
          avatarUrl: m.user.avatar_url,
        };
        
        // Add owner badge only if explicitly enabled (SSOT §8.4.2)
        if (publicShowOwnerBadge && m.role === "owner") {
          preview.isOwner = true;
        }
        
        return preview;
      });
    }
    
    return respondSuccess({
      members,
      totalCount,
      hasMore: totalCount > PREVIEW_LIMIT,
      previewLimit: PREVIEW_LIMIT,
    });
  } catch (error) {
    const { id } = await params;
    log.errorWithStack("Failed to get members preview", error, { clubId: id });
    return respondError(error);
  }
}
