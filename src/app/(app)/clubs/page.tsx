/**
 * Clubs List Page
 * 
 * Список всех клубов с поиском и фильтром по городу
 * Использует useLoadingTransition для плавных переходов
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, MapPin } from "lucide-react";
import { ClubCard } from "@/components/clubs/club-card";
import { CreateClubButton } from "@/components/clubs/create-club-button";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { Pagination } from "@/components/ui/pagination";
import { useLoadingTransition } from "@/hooks/use-loading-transition";
import { ClubCardSkeleton } from "@/components/ui/skeletons";
import { DelayedSpinner } from "@/components/ui/delayed-spinner";
import { useAuth } from "@/components/auth/auth-provider";
import type { City } from "@/lib/types/city";
import type { Club } from "@/lib/types/club";
import { parseApiResponse, ClientError } from "@/lib/types/errors";
import { log } from "@/lib/utils/logger";

export default function ClubsPage() {
  // ⚡ PERFORMANCE: Use auth context instead of fetching /api/auth/me
  const { isAuthenticated } = useAuth();
  const [clubs, setClubs] = useState<(Club & { memberCount?: number; eventCount?: number })[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalClubs, setTotalClubs] = useState(0);
  const itemsPerPage = 12;
  
  // Use loading transition hook for smooth UX
  const { isPending, showLoading, startTransition } = useLoadingTransition(300);
  const [initialLoad, setInitialLoad] = useState(true);

  // Load clubs with transition
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    startTransition(() => {
      loadClubs(1);
    });
  }, [selectedCityId, searchQuery]);

  // Load clubs when page changes
  useEffect(() => {
    if (currentPage !== 1) {
      startTransition(() => {
        loadClubs(currentPage);
      });
    }
  }, [currentPage]);

  const loadClubs = async (page: number) => {
    try {
      let url = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/clubs`;
      const params = new URLSearchParams();
      
      params.append("page", page.toString());
      params.append("limit", itemsPerPage.toString());
      
      if (selectedCityId) {
        params.append("cityId", selectedCityId);
      } else if (searchQuery.trim()) {
        params.append("q", searchQuery.trim());
      }

      url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await parseApiResponse<{ clubs: Club[]; total: number }>(res);
      setClubs(data.clubs ?? []);
      setTotalClubs(data.total ?? 0);
    } catch (err) {
      if (err instanceof ClientError) {
        log.error("[loadClubs] Failed to load clubs", { code: err.code });
      }
      setClubs([]);
      setTotalClubs(0);
    } finally {
      setInitialLoad(false);
    }
  };

  const handleCityChange = (cityId: string | null, city: City | null) => {
    setSelectedCityId(cityId);
    setSelectedCity(city);
    if (cityId) {
      setSearchQuery(""); // Clear search when filtering by city
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSelectedCityId(null); // Clear city filter when searching
      setSelectedCity(null);
    }
  };

  // Calculate stats
  const totalMembers = clubs.reduce((sum, club) => sum + (club.memberCount || 0), 0);
  const totalEvents = clubs.reduce((sum, club) => sum + (club.eventCount || 0), 0);
  const totalCities = new Set(clubs.flatMap(club => club.cities?.map(c => c.id) || [])).size;

  return (
    <>
      {/* Заголовок и кнопка создания */}
      <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="heading-h1 mb-1">
              Автомобильные клубы
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Найдите клуб по интересам или создайте свой
            </p>
          </div>
          <CreateClubButton
            isAuthenticated={isAuthenticated}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-base font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            Создать клуб
          </CreateClubButton>
        </div>

        {/* Статистика */}
        <div className="mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide sm:mx-0 sm:px-0">
          <div className="flex gap-4 sm:grid sm:grid-cols-2 md:grid-cols-4 min-w-max sm:min-w-0">
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm min-w-[140px] sm:min-w-0">
              <div className="mb-1 text-sm text-muted-foreground">Всего клубов</div>
              <div className="text-2xl font-bold text-[var(--color-text)] md:text-3xl">
                {clubs.length}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm min-w-[140px] sm:min-w-0">
              <div className="mb-1 text-sm text-muted-foreground">Участников</div>
              <div className="text-2xl font-bold text-[var(--color-text)] md:text-3xl">
                {totalMembers}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm min-w-[140px] sm:min-w-0">
              <div className="mb-1 text-sm text-muted-foreground">Событий</div>
              <div className="text-2xl font-bold text-[var(--color-text)] md:text-3xl">
                {totalEvents}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm min-w-[140px] sm:min-w-0">
              <div className="mb-1 text-sm text-muted-foreground">Городов</div>
              <div className="text-2xl font-bold text-[var(--color-text)] md:text-3xl">
                {totalCities}
              </div>
            </div>
          </div>
        </div>

        {/* Фильтры */}
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Поиск по названию */}
          <form onSubmit={handleSearchSubmit} className="relative md:col-span-6">
            <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск клубов..."
              className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-white pl-12 pr-4 text-base placeholder:text-muted-foreground transition-colors hover:border-[#D1D5DB] focus:border-[var(--color-primary)] focus:outline-none"
              disabled={!!selectedCityId}
            />
          </form>

          {/* Фильтр по городу */}
          <div className="md:col-span-6">
            <CityAutocomplete
              value={selectedCityId}
              onChange={handleCityChange}
              placeholder="Фильтр по городу..."
              disabled={!!searchQuery.trim()}
            />
          </div>
        </div>

        {/* Active filters */}
        {(selectedCity || searchQuery) && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            {selectedCity && (
              <div className="flex items-center gap-2 rounded-full bg-[var(--color-primary-bg)] px-3 py-1 text-[var(--color-primary)]">
                <MapPin className="h-4 w-4" />
                <span>
                  {selectedCity.region
                    ? `${selectedCity.name}, ${selectedCity.region}`
                    : selectedCity.name}
                </span>
                <button
                  onClick={() => {
                    setSelectedCityId(null);
                    setSelectedCity(null);
                  }}
                  className="ml-1 hover:text-[var(--color-primary-hover)]"
                  aria-label="Очистить фильтр по городу"
                >
                  ×
                </button>
              </div>
            )}
            {searchQuery && (
              <div className="flex items-center gap-2 rounded-full bg-[var(--color-primary-bg)] px-3 py-1 text-[var(--color-primary)]">
                <Search className="h-4 w-4" />
                <span>"{searchQuery}"</span>
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-1 hover:text-[var(--color-primary-hover)]"
                  aria-label="Очистить поисковый запрос"
                >
                  ×
                </button>
              </div>
            )}
            <span>• Найдено клубов: {totalClubs}</span>
          </div>
        )}

        {/* Список клубов */}
        {initialLoad ? (
          // Initial loading skeleton
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ClubCardSkeleton key={i} />
            ))}
          </div>
        ) : clubs.length > 0 ? (
          <>
            {/* Show delayed spinner during transitions */}
            <DelayedSpinner show={showLoading} className="mb-4" />
            
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {clubs.map((club) => (
                <ClubCard key={club.id} club={club} />
              ))}
            </div>
            
            {/* Pagination */}
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalClubs / itemsPerPage)}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-[#E5E7EB] bg-white py-16 text-center">
            <div className="mx-auto max-w-md">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F9FAFB]">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-[18px] font-semibold text-[#1F2937]">
                {searchQuery || selectedCity ? "Клубы не найдены" : "Пока нет клубов"}
              </h3>
              <p className="mb-6 text-[15px] text-muted-foreground">
                {searchQuery || selectedCity
                  ? "Попробуйте изменить поисковый запрос или фильтр"
                  : "Создайте первый клуб и соберите единомышленников"}
              </p>
              {!searchQuery && !selectedCity && (
                <CreateClubButton
                  isAuthenticated={isAuthenticated}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-[15px] font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
                >
                  <Plus className="h-4 w-4" />
                  Создать клуб
                </CreateClubButton>
              )}
            </div>
          </div>
        )}
    </>
  );
}

