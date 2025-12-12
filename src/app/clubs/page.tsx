/**
 * Clubs List Page
 * 
 * Список всех клубов с поиском
 */

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { ClubCard } from "@/components/clubs/club-card";

export const dynamic = "force-dynamic";

async function getClubs(query?: string) {
  try {
    const url = query
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/clubs?q=${encodeURIComponent(query)}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/api/clubs`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    
    const data = await res.json();
    return data.clubs ?? [];
  } catch (err) {
    console.error("[getClubs] Failed", err);
    return [];
  }
}

interface ClubsPageProps {
  searchParams?: { q?: string };
}

export default async function ClubsPage({ searchParams }: ClubsPageProps) {
  const query = searchParams?.q;
  const clubs = await getClubs(query);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Заголовок и кнопка создания */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Клубы</h1>
            <p className="text-gray-600 mt-2">
              Найдите клуб по интересам или создайте свой
            </p>
          </div>
          <Link
            href="/clubs/create"
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Создать клуб
          </Link>
        </div>

        {/* Поиск */}
        <div className="mb-6">
          <form action="/clubs" method="get" className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Поиск клубов по названию или городу..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </form>
        </div>

        {/* Результаты поиска */}
        {query && (
          <div className="mb-4 text-sm text-gray-600">
            Найдено клубов: {clubs.length}
          </div>
        )}

        {/* Список клубов */}
        {clubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club: any) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {query ? "Клубы не найдены" : "Пока нет клубов"}
              </h3>
              <p className="text-gray-600 mb-6">
                {query
                  ? "Попробуйте изменить поисковый запрос"
                  : "Создайте первый клуб и соберите единомышленников"}
              </p>
              {!query && (
                <Link
                  href="/clubs/create"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Создать клуб
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

