/**
 * Clubs List Page
 * 
 * Список всех клубов с поиском и фильтром по городу
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, MapPin } from "lucide-react";
import { ClubCard } from "@/components/clubs/club-card";
import { CreateClubButton } from "@/components/clubs/create-club-button";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import type { City } from "@/lib/types/city";
import type { Club } from "@/lib/types/club";

export default function ClubsPage() {
  const [clubs, setClubs] = useState<(Club & { memberCount?: number; eventCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load clubs
  useEffect(() => {
    loadClubs();
  }, [selectedCityId, searchQuery]);

  // Check authentication
  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => setIsAuthenticated(!!data?.user))
      .catch(() => setIsAuthenticated(false));
  }, []);

  const loadClubs = async () => {
    setLoading(true);
    try {
      let url = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/clubs`;
      const params = new URLSearchParams();
      
      if (selectedCityId) {
        params.append("cityId", selectedCityId);
      } else if (searchQuery.trim()) {
        params.append("q", searchQuery.trim());
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load clubs");
      
      const data = await res.json();
      setClubs(data.clubs ?? []);
    } catch (err) {
      console.error("[loadClubs] Failed", err);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = (cityId: string | null, city: City | null) => {
    setSelectedCityId(cityId);
    setSelectedCity(city);
    if (cityId) {
      setSearchQuery(""); // Clear search when filtering by city
    }
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
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="page-container">
        {/* Заголовок и кнопка создания */}
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-1 text-[28px] font-bold leading-tight text-[#1F2937] md:text-[32px]">
              Автомобильные клубы
            </h1>
            <p className="text-[14px] text-[#6B7280] md:text-[15px]">
              Найдите клуб по интересам или создайте свой
            </p>
          </div>
          <CreateClubButton
            isAuthenticated={isAuthenticated}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-[15px] font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            Создать клуб
          </CreateClubButton>
        </div>

        {/* Статистика */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <div className="mb-1 text-[13px] text-[#6B7280]">Всего клубов</div>
            <div className="text-[24px] font-bold text-[#1F2937] md:text-[28px]">
              {clubs.length}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <div className="mb-1 text-[13px] text-[#6B7280]">Участников</div>
            <div className="text-[24px] font-bold text-[#1F2937] md:text-[28px]">
              {totalMembers}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <div className="mb-1 text-[13px] text-[#6B7280]">Событий</div>
            <div className="text-[24px] font-bold text-[#1F2937] md:text-[28px]">
              {totalEvents}
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
            <div className="mb-1 text-[13px] text-[#6B7280]">Городов</div>
            <div className="text-[24px] font-bold text-[#1F2937] md:text-[28px]">
              {totalCities}
            </div>
          </div>
        </div>

        {/* Фильтры */}
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Поиск по названию */}
          <form onSubmit={handleSearchSubmit} className="relative md:col-span-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск клубов..."
              className="h-12 w-full rounded-xl border-2 border-[#E5E7EB] bg-white pl-12 pr-4 text-[15px] placeholder:text-[#6B7280] hover:border-[#6B7280] focus:border-[var(--color-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--color-primary-bg)]"
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
          <div className="mb-4 flex items-center gap-2 text-[14px] text-[#6B7280]">
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
            <span>• Найдено клубов: {clubs.length}</span>
          </div>
        )}

        {/* Список клубов */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--color-primary)]"></div>
            <p className="mt-4 text-[#6B7280]">Загрузка...</p>
          </div>
        ) : clubs.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {clubs.map((club) => (
              <ClubCard key={club.id} club={club} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-[#E5E7EB] bg-white py-16 text-center">
            <div className="mx-auto max-w-md">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F9FAFB]">
                <Search className="h-8 w-8 text-[#6B7280]" />
              </div>
              <h3 className="mb-2 text-[18px] font-semibold text-[#1F2937]">
                {searchQuery || selectedCity ? "Клубы не найдены" : "Пока нет клубов"}
              </h3>
              <p className="mb-6 text-[15px] text-[#6B7280]">
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
      </div>
    </div>
  );
}

