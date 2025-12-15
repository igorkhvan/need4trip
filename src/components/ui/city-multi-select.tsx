"use client";

/**
 * City Multi-Select Component
 * 
 * Компонент для выбора нескольких городов
 * Используется в форме создания/редактирования клуба
 */

import { useState, useEffect, useRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCities, setSelectedCities] = useState<City[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load initial popular cities when opened
  useEffect(() => {
    if (open && cities.length === 0 && !searchQuery) {
      loadPopularCities();
    }
  }, [open]);

  // Load selected cities by IDs
  useEffect(() => {
    if (value.length > 0) {
      loadCitiesByIds(value);
    } else {
      setSelectedCities([]);
    }
  }, [value]);

  // Search cities on query change (debounced)
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!searchQuery || searchQuery.length < 2) {
      // Если запрос пустой или короткий, показываем популярные города
      if (open) {
        loadPopularCities();
      }
      return;
    }

    debounceTimer.current = setTimeout(() => {
      searchCities(searchQuery);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  const loadPopularCities = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cities?popular=true");
      if (!res.ok) throw new Error("Failed to load cities");
      const data = await res.json();
      setCities(data.cities || []);
    } catch (error) {
      console.error("Failed to load popular cities:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchCities = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cities?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to search cities");
      const data = await res.json();
      setCities(data.cities || []);
    } catch (error) {
      console.error("Failed to search cities:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCitiesByIds = async (cityIds: string[]) => {
    try {
      const res = await fetch(`/api/cities?ids=${cityIds.join(",")}`);
      if (!res.ok) throw new Error("Failed to load cities");
      const data = await res.json();
      setSelectedCities(data.cities || []);
    } catch (error) {
      console.error("Failed to load cities by IDs:", error);
    }
  };

  const handleSelect = (city: City) => {
    if (disabled) return;

    const isSelected = value.includes(city.id);

    if (isSelected) {
      // Remove city
      const newValue = value.filter((id) => id !== city.id);
      const newCities = selectedCities.filter((c) => c.id !== city.id);
      setSelectedCities(newCities);
      onChange(newValue, newCities);
    } else {
      // Add city (check max limit)
      if (value.length >= maxItems) {
        return; // Reached max limit
      }
      const newValue = [...value, city.id];
      const newCities = [...selectedCities, city];
      setSelectedCities(newCities);
      onChange(newValue, newCities);
    }
  };

  const handleRemove = (cityId: string) => {
    if (disabled) return;
    const newValue = value.filter((id) => id !== cityId);
    const newCities = selectedCities.filter((c) => c.id !== cityId);
    setSelectedCities(newCities);
    onChange(newValue, newCities);
  };

  const displayText =
    selectedCities.length === 0
      ? placeholder
      : `Выбрано: ${selectedCities.length}`;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-12 w-full justify-between rounded-xl text-left font-normal shadow-none hover:bg-white",
              error ? "border-red-500 focus:border-red-500" : "",
              selectedCities.length === 0 && "text-[#9CA3AF]",
              className
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className={cn("h-4 w-4 shrink-0", selectedCities.length > 0 ? "text-[#6B7280]" : "text-[#9CA3AF]")} />
              <span className="truncate text-[15px]">{displayText}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Поиск города..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>
              {loading ? "Загрузка..." : "Город не найден"}
            </CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {cities.map((city) => {
                const isSelected = value.includes(city.id);
                const isDisabled = !isSelected && value.length >= maxItems;

                return (
                  <CommandItem
                    key={city.id}
                    value={city.id}
                    onSelect={() => !isDisabled && handleSelect(city)}
                    className={cn(
                      "cursor-pointer",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{city.name}</span>
                      {city.region && (
                        <span className="text-xs text-[#6B7280]">{city.region}</span>
                      )}
                    </div>
                    {city.isPopular && (
                      <span className="ml-auto text-xs text-[#FF6F2C]">★</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected cities badges */}
      {selectedCities.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedCities.map((city) => (
            <Badge
              key={city.id}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="text-sm">
                {city.region ? `${city.name}, ${city.region}` : city.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(city.id)}
                disabled={disabled}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {errorMessage && (
        <div className="min-h-[28px] text-xs text-red-600 mt-1">{errorMessage}</div>
      )}
      
      {!errorMessage && maxItems && value.length >= maxItems && (
        <div className="min-h-[28px] text-xs text-gray-500 mt-1">
          Максимум {maxItems} городов
        </div>
      )}
    </>
  );
}

