/**
 * Club Management Page
 * 
 * Страница управления клубом (только для owner/organizer)
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
    
    const data = await res.json();
    return data.club;
  } catch (err) {
    console.error("[getClubDetails] Failed", err);
    return null;
  }
}

interface ClubManagePageProps {
  params: { id: string };
}

export default async function ClubManagePage({ params }: ClubManagePageProps) {
  const [club, user] = await Promise.all([
    getClubDetails(params.id),
    getCurrentUser(),
  ]);

  if (!club) {
    notFound();
  }

  if (!user) {
    redirect(`/clubs/${params.id}`);
  }

  // Проверка прав доступа
  const currentUserMember = club.members?.find(
    (m: any) => m.userId === user.id
  );
  const userRole = currentUserMember?.role;
  const canManage = userRole === "owner" || userRole === "organizer";

  if (!canManage) {
    redirect(`/clubs/${params.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Кнопка назад */}
        <Link
          href={`/clubs/${params.id}`}
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
              window.location.href = `/clubs/${params.id}`;
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

