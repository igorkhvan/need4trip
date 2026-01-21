/**
 * Club Management Page (LEGACY — FROZEN)
 * 
 * Phase 3B: This route is frozen and redirects to canonical /settings route.
 * 
 * LEGACY: Страница управления клубом (только для owner)
 * Per SSOT_CLUBS_DOMAIN.md §3.2: club management is owner-only
 * 
 * @deprecated Use /clubs/[id]/settings instead
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { ClubForm } from "@/components/clubs/club-form";

export const dynamic = "force-dynamic";

async function getClubDetails(id: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/clubs/${id}`, {
      cache: "no-store",
    });
    
    if (!res.ok) return null;
    
    const response = await res.json();
    const data = response.data || response;
    return data.club;
  } catch (err) {
    console.error("[getClubDetails] Failed", err);
    return null;
  }
}

interface ClubManagePageProps {
  params: Promise<{ id: string }>;
}

export default async function ClubManagePage({ params }: ClubManagePageProps) {
  // Phase 3B: Unconditional redirect to canonical /settings route
  const { id } = await params;
  redirect(`/clubs/${id}/settings`);

  // ============================================================================
  // LEGACY CODE BELOW (UNREACHABLE after redirect)
  // Preserved per Phase 3B requirement: "Do NOT remove legacy code below redirect"
  // ============================================================================

  const [club, user] = await Promise.all([
    getClubDetails(id),
    getCurrentUser(),
  ]);

  if (!club) {
    notFound();
  }

  if (!user) {
    redirect(`/clubs/${id}`);
  }

  // Проверка прав доступа
  // Note: user is guaranteed non-null here due to redirect above
  const currentUserMember = club.members?.find(
    (m: any) => m.userId === user!.id
  );
  const userRole = currentUserMember?.role;
  // Per SSOT_CLUBS_EVENTS_ACCESS.md §2: "organizer" role is deprecated
  // Club management page is owner-only (SSOT_CLUBS_DOMAIN.md §3.2)
  const canManage = userRole === "owner";

  if (!canManage) {
    redirect(`/clubs/${id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Кнопка назад */}
        <Link
          href={`/clubs/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад к клубу
        </Link>

        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Управление клубом</h1>
          <p className="text-gray-600 mt-2">
            Редактируйте информацию о клубе
          </p>
        </div>

        {/* Форма */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <ClubForm
            mode="edit"
            club={club}
            onCancel={() => {
              window.location.href = `/clubs/${id}`;
            }}
          />
        </div>

        {/* Дополнительные настройки (только для owner) */}
        {userRole === "owner" && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-4">
              Опасная зона
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Удаление клуба необратимо. Все данные клуба будут потеряны.
            </p>
            <button className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
              Удалить клуб
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

