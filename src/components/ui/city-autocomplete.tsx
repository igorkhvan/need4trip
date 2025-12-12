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
  className?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = "Выберите город",
  disabled = false,
  error = false,
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

  const loadCityById = async (cityId: string) => {
    try {
      const res = await fetch(`/api/cities/${cityId}`);
      if (!res.ok) throw new Error("Failed to load city");
      const data = await res.json();
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-12 w-full justify-between rounded-xl border-2",
            error && "border-red-500",
            !selectedCity && "text-gray-500",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
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
                    <span className="text-xs text-gray-500">{city.region}</span>
                  )}
                </div>
                {city.isPopular && (
                  <span className="ml-auto text-xs text-orange-500">★</span>
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
              className="w-full text-gray-500 hover:text-gray-700"
            >
              Очистить выбор
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
