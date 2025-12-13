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
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import type { City } from "@/lib/types/city";
import type { Club } from "@/lib/types/club";

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  // Load clubs
  useEffect(() => {
    loadClubs();
  }, [selectedCityId, searchQuery]);

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

        {/* Фильтры */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Поиск по названию */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию клуба..."
              className="w-full h-12 pl-12 pr-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={!!selectedCityId}
            />
          </form>

          {/* Фильтр по городу */}
          <div>
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
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            {selectedCity && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full">
                <MapPin className="w-4 h-4" />
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
                  className="ml-1 hover:text-primary-900"
                >
                  ×
                </button>
              </div>
            )}
            {searchQuery && (
              <div className="flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-700 rounded-full">
                <Search className="w-4 h-4" />
                <span>"{searchQuery}"</span>
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-1 hover:text-primary-900"
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
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Загрузка...</p>
          </div>
        ) : clubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => (
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
                {searchQuery || selectedCity ? "Клубы не найдены" : "Пока нет клубов"}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedCity
                  ? "Попробуйте изменить поисковый запрос или фильтр"
                  : "Создайте первый клуб и соберите единомышленников"}
              </p>
              {!searchQuery && !selectedCity && (
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

