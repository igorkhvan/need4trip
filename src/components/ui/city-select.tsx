/**
 * City Select Component - Wrapper around GenericSelect
 * 
 * Autocomplete dropdown for selecting cities from normalized cities table
 * 
 * Features:
 * - Async loading from /api/cities
 * - Popular cities on open
 * - Search with debounce (300ms)
 * - Country flag + city name display
 * 
 * Architecture:
 * - Thin wrapper around GenericSelect
 * - Maintains exact same API as before (zero breaking changes)
 */

"use client";

import * as React from "react";
import { MapPin } from "lucide-react";
import { GenericSelect } from "@/components/ui/generic-select";
import type { City } from "@/lib/types/city";
import { formatCityName, getCountryFlag } from "@/lib/types/city";

interface CitySelectProps {
  value: string | null; // city ID
  onChange: (cityId: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: boolean;
  className?: string;
}

export function CitySelect({
  value,
  onChange,
  disabled = false,
  placeholder = "Выберите город...",
  error = false,
  className,
}: CitySelectProps) {
  // Load popular cities initially
  const loadInitial = React.useCallback(async () => {
    const res = await fetch("/api/cities?popular=true&limit=20");
    if (!res.ok) throw new Error("Failed to load cities");
    const response = await res.json();
    const data = response.data || response;
    return (data.cities || []) as City[];
  }, []);
  
  // Search cities by query
  const loadItems = React.useCallback(async (query: string) => {
    const res = await fetch(`/api/cities?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Failed to search cities");
    const response = await res.json();
    const data = response.data || response;
    return (data.cities || []) as City[];
  }, []);
  
  // Load city by ID (for selected value not in list)
  const loadById = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/cities/${id}`);
    if (!res.ok) return null;
    const response = await res.json();
    const data = response.data || response;
    return (data.city || null) as City | null;
  }, []);
  
  // Custom item renderer with flag + region
  const renderItem = React.useCallback((city: City, isSelected: boolean) => {
    return (
      <>
        <span className={isSelected ? "opacity-100 mr-2" : "opacity-0 mr-2"}>✓</span>
        <div className="flex items-center gap-2">
          <span>{getCountryFlag(city.country)}</span>
          <div className="flex flex-col">
            <span className="font-medium">{city.name}</span>
            {city.region && city.region !== city.name && (
              <span className="text-xs text-gray-500">{city.region}</span>
            )}
          </div>
        </div>
      </>
    );
  }, []);
  
  // Custom trigger renderer with flag
  const renderTrigger = React.useCallback((selectedCities: City[], ph: string) => {
    return (
      <div className="flex items-center gap-2 truncate">
        <MapPin className="h-4 w-4 shrink-0 opacity-50" />
        {selectedCities.length > 0 ? (
          <span>
            {getCountryFlag(selectedCities[0].country)} {formatCityName(selectedCities[0])}
          </span>
        ) : (
          <span>{ph}</span>
        )}
      </div>
    );
  }, []);
  
  return (
    <GenericSelect<City>
      mode="single"
      value={value}
      onChange={(val) => onChange(val as string | null)}
      
      loadInitial={loadInitial}
      loadItems={loadItems}
      loadById={loadById}
      
      getItemId={(city) => city.id}
      getItemLabel={(city) => formatCityName(city)}
      
      renderItem={renderItem}
      renderTrigger={renderTrigger}
      
      placeholder={placeholder}
      searchPlaceholder="Начните печатать название города..."
      emptyMessage="Города не найдены"
      // SSOT: SSOT_UI_COPY §2.2 - Inline async: ❌ No text (uses default)
      
      disabled={disabled}
      error={error}
      className={className}
      
      debounceMs={300}
      shouldFilter={false}
    />
  );
}
