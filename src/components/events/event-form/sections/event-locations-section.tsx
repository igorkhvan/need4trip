/**
 * EventLocationsSection Component
 * Section for managing multiple location points in event form
 * Part of EventForm refactoring
 */

"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationItem } from "@/components/events/locations/location-item";
import type { EventLocationInput } from "@/lib/types/eventLocation";

interface EventLocationsSectionProps {
  locations: EventLocationInput[];
  onLocationsChange: (locations: EventLocationInput[]) => void;
  fieldErrors: Record<string, string>;
  clearFieldError: (field: string) => void;
  disabled?: boolean;
}

export function EventLocationsSection({
  locations,
  onLocationsChange,
  fieldErrors,
  clearFieldError,
  disabled,
}: EventLocationsSectionProps) {
  // Sort locations by sortOrder
  const sortedLocations = [...locations].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleAddLocation = () => {
    // Find next available sort_order
    const maxOrder = Math.max(...locations.map((loc) => loc.sortOrder), 0);
    const newLocation: EventLocationInput = {
      sortOrder: maxOrder + 1,
      title: `Точка ${maxOrder + 1}`,
      latitude: null,
      longitude: null,
      rawInput: null,
    };
    onLocationsChange([...locations, newLocation]);
  };

  const handleUpdateLocation = (sortOrder: number, patch: Partial<EventLocationInput>) => {
    const updated = locations.map((loc) =>
      loc.sortOrder === sortOrder ? { ...loc, ...patch } : loc
    );
    onLocationsChange(updated);
    
    // Clear field error for this location
    clearFieldError(`locations.${sortOrder}.title`);
    clearFieldError(`locations.${sortOrder}.coordinates`);
  };

  const handleDeleteLocation = (sortOrder: number) => {
    // Prevent deletion of first location
    if (sortOrder === 1) {
      return;
    }
    
    const filtered = locations.filter((loc) => loc.sortOrder !== sortOrder);
    onLocationsChange(filtered);
  };

  return (
    <div className="space-y-4">
      {/* Locations List */}
      <div className="space-y-4">
        {sortedLocations.map((location, index) => (
          <LocationItem
            key={location.id || location.sortOrder}
            location={location}
            index={index}
            isFirst={location.sortOrder === 1}
            onUpdate={(patch) => handleUpdateLocation(location.sortOrder, patch)}
            onDelete={() => handleDeleteLocation(location.sortOrder)}
            disabled={disabled}
            error={
              fieldErrors[`locations.${location.sortOrder}.title`] ||
              fieldErrors[`locations.${location.sortOrder}.coordinates`]
            }
            onErrorClear={() => {
              clearFieldError(`locations.${location.sortOrder}.title`);
              clearFieldError(`locations.${location.sortOrder}.coordinates`);
            }}
          />
        ))}
      </div>

      {/* Add Location Button */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAddLocation}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          Добавить точку маршрута
        </Button>
      </div>

      {/* Hint */}
      <div className="rounded-lg bg-[#F0F9FF] p-4 text-sm text-[#1E40AF]">
        <p className="font-medium">💡 Как вводить координаты:</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
          <li>Координаты: <code className="rounded bg-white px-1">43.238949, 76.889709</code></li>
          <li>Ссылка с карты: Google Maps, Яндекс Карты, 2ГИС</li>
          <li>Можно оставить пустым и заполнить позже</li>
        </ul>
      </div>
    </div>
  );
}
