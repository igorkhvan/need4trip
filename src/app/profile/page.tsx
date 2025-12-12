/**
 * User Profile Page
 * 
 * Страница профиля пользователя
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { UserPlanCard } from "@/components/profile/user-plan-card";
import { UserClubsList } from "@/components/profile/user-clubs-list";
import { UserStatsCard } from "@/components/profile/user-stats-card";
import { Settings, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

async function getProfile() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/profile`, {
      cache: "no-store",
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("[getProfile] Failed", err);
    return null;
  }
}

export default async function ProfilePage() {
  const [user, profileData] = await Promise.all([
    getCurrentUser(),
    getProfile(),
  ]);

  if (!user) {
    redirect("/");
  }

  const clubs = profileData?.clubs ?? [];
  const stats = profileData?.stats ?? { clubsCount: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Мой профиль</h1>
            <p className="text-gray-600 mt-2">
              Управление аккаунтом, клубами и подпиской
            </p>
          </div>
          <div className="flex gap-3">
            {/* TODO: Link to settings */}
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="w-5 h-5" />
              Настройки
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Основная информация */}
          <div className="lg:col-span-2 space-y-6">
            {/* Информация о пользователе */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start gap-6">
                {/* Аватар */}
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name ?? "Пользователь"}
                    className="w-24 h-24 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                    {(user.name ?? "U").charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {user.name ?? "Пользователь"}
                  </h2>
                  {user.telegramHandle && (
                    <a
                      href={`https://t.me/${user.telegramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 mb-3 inline-block"
                    >
                      @{user.telegramHandle}
                    </a>
                  )}

                  {/* Дополнительная информация */}
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    {user.city && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">📍</span>
                        <span className="font-medium">{user.city}</span>
                      </div>
                    )}
                    {user.phone && <div>Телефон: {user.phone}</div>}
                    {user.email && <div>Email: {user.email}</div>}
                    {user.carModel && <div>Автомобиль: {user.carModel}</div>}
                    {user.experienceLevel && (
                      <div>
                        Опыт:{" "}
                        {user.experienceLevel === "beginner"
                          ? "Начинающий"
                          : user.experienceLevel === "intermediate"
                          ? "Средний"
                          : "Профессионал"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Статистика */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Статистика</h2>
              <UserStatsCard stats={stats} />
            </div>

            {/* Клубы */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Мои клубы ({clubs.length})
              </h2>
              <UserClubsList clubs={clubs} />
            </div>
          </div>

          {/* Боковая панель */}
          <div className="space-y-6">
            {/* Подписка */}
            <UserPlanCard plan={profileData?.user?.plan ?? "free"} />

            {/* Выход */}
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Выйти из аккаунта
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

