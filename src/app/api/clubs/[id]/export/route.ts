/**
 * API: /api/clubs/[id]/export
 * 
 * GET - Export club members to CSV
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getClub } from "@/lib/services/clubs";
import { listMembers } from "@/lib/db/clubMemberRepo";
import { getUserById } from "@/lib/db/userRepo";
import { checkPaywall } from "@/lib/services/paywall";
import { respondError } from "@/lib/api/response";
import { AuthError, NotFoundError } from "@/lib/errors";
import { canManageClub } from "@/lib/services/permissions";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

/**
 * GET /api/clubs/[id]/export
 * Export club members to CSV
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: clubId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      throw new AuthError("Необходима авторизация");
    }

    // Check if club exists and user can manage it
    const club = await getClub(clubId);
    if (!club) {
      throw new NotFoundError("Клуб не найден");
    }

    const canManage = await canManageClub(user.id, clubId);
    if (!canManage.allowed) {
      throw new AuthError(canManage.reason || "Нет доступа к экспорту участников", undefined, 403);
    }

    // Check paywall
    const paywallTrigger = await checkPaywall(user, "export_csv", { clubId });
    if (paywallTrigger) {
      return NextResponse.json(
        { paywall: paywallTrigger },
        { status: 402 } // Payment Required
      );
    }

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
      "car_year",
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
        user.carYear || "",
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

