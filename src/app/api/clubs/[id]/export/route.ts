/**
 * API: /api/clubs/[id]/export
 * 
 * GET - Export club members to CSV
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveCurrentUser } from "@/lib/auth/resolveCurrentUser";
import { getClub } from "@/lib/services/clubs";
import { listMembers } from "@/lib/db/clubMemberRepo";
import { getUserById } from "@/lib/db/userRepo";
import { getUserClubRole } from "@/lib/services/clubs";
import { enforceClubAction } from "@/lib/services/accessControl";
import { respondError } from "@/lib/api/response";
import { AuthError, NotFoundError, ForbiddenError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

/**
 * GET /api/clubs/[id]/export
 * Export club members to CSV
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: clubId } = await params;
    
    // Canonical auth resolution (ADR-001)
    const user = await resolveCurrentUser(req);

    if (!user) {
      throw new AuthError("Необходима авторизация");
    }

    // Check if club exists
    const club = await getClub(clubId);
    if (!club) {
      throw new NotFoundError("Клуб не найден");
    }

    // Check user permission (owner/admin)
    const userRole = await getUserClubRole(user.id, clubId);
    const canManage = userRole === "owner" || userRole === "admin";
    
    if (!canManage) {
      throw new ForbiddenError("Нет доступа к экспорту участников");
    }

    // ⚡ Billing v2.0: Check if club plan allows CSV export
    await enforceClubAction({
      clubId,
      action: "CLUB_EXPORT_PARTICIPANTS_CSV",
    });

    // Get all members
    const members = await listMembers(clubId);

    // Fetch user details for each member
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        const memberUser = await getUserById(member.user_id);
        return {
          member,
          user: memberUser,
        };
      })
    );

    // Generate CSV
    const csvRows: string[] = [];

    // Header
    csvRows.push([
      "user_id",
      "name",
      "telegram_handle",
      "city",
      "car_brand",
      "car_model",
      "role",
      "joined_at",
    ].join(","));

    // Data rows
    for (const { member, user } of membersWithDetails) {
      if (!user) continue;

      const row = [
        user.id,
        escapeCSV(user.name),
        escapeCSV(user.telegramHandle || ""),
        escapeCSV(user.city?.name || ""),
        escapeCSV(user.carBrand?.name || ""),
        escapeCSV(user.carModelText || ""),
        member.role,
        member.joined_at,
      ];

      csvRows.push(row.join(","));
    }

    const csv = csvRows.join("\n");

    // Return CSV file
    const filename = `${club.name}_members_${new Date().toISOString().split("T")[0]}.csv`;
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    return respondError(error);
  }
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string): string {
  if (!value) return "";
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

