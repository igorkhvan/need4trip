/**
 * City Multi-Select Component - Wrapper around GenericSelect
 * 
 * Multi-select dropdown for selecting multiple cities
 * Used in club creation/edit forms
 * 
 * Features:
 * - Async loading from /api/cities
 * - Multiple selection with badges
 * - Max items limit
 * - Popular cities on open
 * 
 * Architecture:
 * - Thin wrapper around GenericSelect
 * - Maintains exact same API as before (zero breaking changes)
 */

"use client";

import * as React from "react";
import { MapPin } from "lucide-react";
import { GenericSelect } from "@/components/ui/generic-select";
import { City } from "@/lib/types/city";

interface CityMultiSelectProps {
  value: string[]; // Array of city IDs
  onChange: (cityIds: string[], cities: City[]) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  className?: string;
  maxItems?: number;
}

export function CityMultiSelect({
  value,
  onChange,
  placeholder = "Выберите города",
  disabled = false,
  error = false,
  errorMessage,
  className,
  maxItems = 10,
}: CityMultiSelectProps) {
  // Track cities for onChange callback
  const [cities, setCities] = React.useState<City[]>([]);
  
  // Load popular cities initially
  const loadInitial = React.useCallback(async () => {
    const res = await fetch("/api/cities?popular=true");
    if (!res.ok) throw new Error("Failed to load cities");
    const response = await res.json();
    const data = response.data || response;
    const loadedCities = (data.cities || []) as City[];
    setCities(prev => {
      const combined = [...prev];
      loadedCities.forEach(city => {
        if (!combined.some(c => c.id === city.id)) {
          combined.push(city);
        }
      });
      return combined;
    });
    return loadedCities;
  }, []);
  
  // Search cities by query
  const loadItems = React.useCallback(async (query: string) => {
    const res = await fetch(`/api/cities?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Failed to search cities");
    const response = await res.json();
    const data = response.data || response;
    const searchedCities = (data.cities || []) as City[];
    setCities(prev => {
      const combined = [...prev];
      searchedCities.forEach(city => {
        if (!combined.some(c => c.id === city.id)) {
          combined.push(city);
        }
      });
      return combined;
    });
    return searchedCities;
  }, []);
  
  // Load cities by IDs (for selected values)
  React.useEffect(() => {
    if (value.length === 0) return;
    
    async function loadByIds() {
      try {
        const res = await fetch(`/api/cities?ids=${value.join(",")}`);
        if (!res.ok) return;
        const response = await res.json();
        const data = response.data || response;
        const loadedCities = (data.cities || []) as City[];
        setCities(prev => {
          const combined = [...prev];
          loadedCities.forEach(city => {
            if (!combined.some(c => c.id === city.id)) {
              combined.push(city);
            }
          });
          return combined;
        });
      } catch (err) {
        console.error("Failed to load cities by IDs:", err);
      }
    }
    
    loadByIds();
  }, [value]);
  
  // Custom item renderer with region
  const renderItem = React.useCallback((city: City, isSelected: boolean) => {
    return (
      <>
        <span className={isSelected ? "opacity-100 mr-2" : "opacity-0 mr-2"}>✓</span>
        <div className="flex flex-col flex-1">
          <span className="font-medium">{city.name}</span>
          {city.region && (
            <span className="text-xs text-[#6B7280]">{city.region}</span>
          )}
        </div>
        {city.isPopular && (
          <span className="ml-auto text-xs text-[#FF6F2C]">★</span>
        )}
      </>
    );
  }, []);
  
  // Handle change: also pass cities array for backward compatibility
  const handleChange = React.useCallback((newValue: string | string[] | null) => {
    const ids = Array.isArray(newValue) ? newValue : [];
    const selectedCities = cities.filter(c => ids.includes(c.id));
    onChange(ids, selectedCities);
  }, [cities, onChange]);
  
  return (
    <GenericSelect<City>
      mode="multi"
      value={value}
      onChange={handleChange}
      
      loadInitial={loadInitial}
      loadItems={loadItems}
      
      getItemId={(city) => city.id}
      getItemLabel={(city) => city.region ? `${city.name}, ${city.region}` : city.name}
      
      renderItem={renderItem}
      
      placeholder={placeholder}
      searchPlaceholder="Поиск города..."
      emptyMessage="Город не найден"
      loadingMessage="Загрузка..."
      
      icon={<MapPin className="h-4 w-4" />}
      
      disabled={disabled}
      error={error}
      errorMessage={errorMessage}
      className={className}
      
      maxItems={maxItems}
      debounceMs={300}
      shouldFilter={false}
      badgesPosition="inside"
      
      popoverContentClassName="w-[400px]"
    />
  );
}
