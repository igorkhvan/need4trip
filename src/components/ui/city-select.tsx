/**
 * City Select Component
 * 
 * Autocomplete dropdown for selecting cities from normalized cities table
 */

"use client";

import * as React from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [open, setOpen] = React.useState(false);
  const [cities, setCities] = React.useState<City[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Selected city (for display)
  const selectedCity = React.useMemo(() => {
    return cities.find((c) => c.id === value) || null;
  }, [cities, value]);

  // Load popular cities on mount
  React.useEffect(() => {
    async function loadPopularCities() {
      setLoading(true);
      try {
        const res = await fetch("/api/cities?popular=true&limit=20");
        if (res.ok) {
          const response = await res.json();
          const data = response.data || response;
          setCities(data.cities || []);
        }
      } catch (err) {
        console.error("Failed to load cities", err);
      } finally {
        setLoading(false);
      }
    }
    loadPopularCities();
  }, []);

  // Load selected city by ID if not in the list
  React.useEffect(() => {
    if (!value) return;
    
    // Check if selected city is already in the list
    const cityExists = cities.some((c) => c.id === value);
    if (cityExists) return;

    // Load the selected city
    async function loadSelectedCity() {
      try {
        const res = await fetch(`/api/cities/${value}`);
        if (res.ok) {
          const response = await res.json();
          const data = response.data || response;
          if (data.city) {
            // Add selected city to the list
            setCities((prev) => [data.city, ...prev]);
          }
        }
      } catch (err) {
        console.error("Failed to load selected city", err);
      }
    }
    loadSelectedCity();
  }, [value, cities]);

  // Search cities on input
  React.useEffect(() => {
    if (!searchQuery.trim()) return;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const response = await res.json();
          const data = response.data || response;
          setCities(data.cities || []);
        }
      } catch (err) {
        console.error("Failed to search cities", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-12 w-full justify-between rounded-xl text-left font-normal",
            error && "border-red-500 focus:border-red-500",
            !selectedCity && "text-[#6B7280]",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 opacity-50" />
            {selectedCity ? (
              <span className="text-[15px]">
                {getCountryFlag(selectedCity.country)} {formatCityName(selectedCity)}
              </span>
            ) : (
              <span className="text-[15px]">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Начните печатать название города..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <CommandEmpty>Загрузка...</CommandEmpty>
            ) : cities.length === 0 ? (
              <CommandEmpty>Города не найдены</CommandEmpty>
            ) : (
              <CommandGroup>
                {cities.map((city) => (
                  <CommandItem
                    key={city.id}
                    value={city.id}
                    onSelect={() => {
                      onChange(city.id === value ? null : city.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === city.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <span>{getCountryFlag(city.country)}</span>
                      <div className="flex flex-col">
                        <span className="font-medium">{city.name}</span>
                        {city.region && city.region !== city.name && (
                          <span className="text-xs text-gray-500">{city.region}</span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

