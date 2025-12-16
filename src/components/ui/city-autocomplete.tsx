"use client";

/**
 * City Autocomplete Component
 * 
 * Компонент автодополнения для выбора города из справочника
 */

import { useState, useEffect, useRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { City } from "@/lib/types/city";

interface CityAutocompleteProps {
  value?: string | null; // City ID
  onChange: (cityId: string | null, city: City | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  className?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = "Выберите город",
  disabled = false,
  error = false,
  errorMessage,
  className,
}: CityAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load initial popular cities when opened
  useEffect(() => {
    if (open && cities.length === 0 && !searchQuery) {
      loadPopularCities();
    }
  }, [open]);

  // Load selected city by ID
  useEffect(() => {
    if (value && !selectedCity) {
      loadCityById(value);
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
      const response = await res.json();
      const data = response.data || response;
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
      const response = await res.json();
      const data = response.data || response;
      setCities(data.cities || []);
    } catch (error) {
      console.error("Failed to search cities:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCityById = async (cityId: string) => {
    try {
      const res = await fetch(`/api/cities/${cityId}`);
      if (!res.ok) throw new Error("Failed to load city");
      const response = await res.json();
      const data = response.data || response;
      setSelectedCity(data.city);
    } catch (error) {
      console.error("Failed to load city by ID:", error);
    }
  };

  const handleSelect = (city: City) => {
    setSelectedCity(city);
    onChange(city.id, city);
    setOpen(false);
  };

  const handleClear = () => {
    setSelectedCity(null);
    onChange(null, null);
  };

  const displayValue = selectedCity
    ? selectedCity.region
      ? `${selectedCity.name}, ${selectedCity.region}`
      : selectedCity.name
    : placeholder;

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
              !selectedCity && "text-[#6B7280]",
              className
            )}
          >
            <div className="flex items-center gap-2">
              <MapPin className={cn("h-4 w-4", selectedCity ? "text-[#6B7280]" : "text-[#6B7280]")} />
              <span className="truncate">{displayValue}</span>
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
              {cities.map((city) => (
                <CommandItem
                  key={city.id}
                  value={city.id}
                  onSelect={() => handleSelect(city)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCity?.id === city.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{city.name}</span>
                    {city.region && (
                      <span className="text-xs text-[#6B7280]">{city.region}</span>
                    )}
                  </div>
                  {city.isPopular && (
                    <span className="ml-auto text-xs text-[#FF6F2C]">★</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
          {selectedCity && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="w-full text-[#6B7280] hover:text-[#374151]"
              >
                Очистить выбор
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {/* Always reserve space for error message to prevent layout shift */}
      <div className="min-h-[28px] text-xs text-red-600">
        {errorMessage || ""}
      </div>
    </>
  );
}
