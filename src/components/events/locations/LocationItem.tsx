/**
 * LocationItem Component
 * Single location point input with coordinates parsing, validation, and actions
 */

"use client";

import { useState, useEffect } from "react";
import { Eye, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FieldCard } from "@/components/ui/field-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NavigationChooser } from "./NavigationChooser";
import { MapPreviewModal } from "./MapPreviewModal";
import { parseCoordinates, normalizeCoordinates, isShortGoogleMapsLink } from "@/lib/utils/coordinates";
import type { EventLocationInput } from "@/lib/types/eventLocation";

interface LocationItemProps {
  location: EventLocationInput;
  index: number;
  isFirst: boolean; // Первая локация не может быть удалена
  onUpdate: (patch: Partial<EventLocationInput>) => void;
  onDelete: () => void;
  disabled?: boolean;
  error?: string;
  onErrorClear?: () => void;
}

export function LocationItem({
  location,
  index,
  isFirst,
  onUpdate,
  onDelete,
  disabled,
  error,
  onErrorClear,
}: LocationItemProps) {
  const [coordinatesInput, setCoordinatesInput] = useState("");
  const [coordinatesError, setCoordinatesError] = useState<string | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);

  // Initialize coordinates input from location data
  useEffect(() => {
    if (location.latitude !== null && location.longitude !== null) {
      const normalized = normalizeCoordinates(location.latitude, location.longitude);
      setCoordinatesInput(normalized);
    } else if (location.rawInput) {
      setCoordinatesInput(location.rawInput);
    }
  }, [location.latitude, location.longitude, location.rawInput]);

  const hasValidCoordinates = 
    location.latitude !== null && 
    location.longitude !== null;

  const handleTitleChange = (value: string) => {
    onUpdate({ title: value });
    if (onErrorClear) onErrorClear();
  };

  const handleCoordinatesBlur = () => {
    if (!coordinatesInput.trim()) {
      // Empty input - clear coordinates
      setCoordinatesError(null);
      onUpdate({
        latitude: null,
        longitude: null,
        rawInput: null,
      });
      return;
    }

    // Check for short Google Maps links
    if (isShortGoogleMapsLink(coordinatesInput)) {
      setCoordinatesError(
        "Короткие ссылки Google Maps не поддерживаются. Откройте ссылку в браузере, скопируйте координаты или полный URL из адресной строки."
      );
      onUpdate({
        latitude: null,
        longitude: null,
        rawInput: coordinatesInput,
      });
      return;
    }

    // Try to parse coordinates
    const parsed = parseCoordinates(coordinatesInput);

    if (parsed) {
      // Valid coordinates - update location
      setCoordinatesError(null);
      onUpdate({
        latitude: parsed.lat,
        longitude: parsed.lng,
        rawInput: coordinatesInput,
      });
      // Update input to normalized format
      setCoordinatesInput(parsed.normalized);
    } else {
      // Invalid format
      setCoordinatesError(
        "Неверный формат координат. Используйте формат: 43.238949, 76.889709 или полную ссылку Google Maps."
      );
      onUpdate({
        latitude: null,
        longitude: null,
        rawInput: coordinatesInput,
      });
    }
  };

  const handleCoordinatesChange = (value: string) => {
    setCoordinatesInput(value);
    if (coordinatesError) setCoordinatesError(null);
    if (onErrorClear) onErrorClear();
  };

  const handleOpenMap = () => {
    if (hasValidCoordinates) {
      setMapModalOpen(true);
    }
  };

  return (
    <FieldCard
      index={index + 1}
      isFirst={isFirst}
      firstFieldMessage="Первая точка не может быть удалена"
      onDelete={onDelete}
      deleteDisabled={disabled}
      variant="subtle"
    >
      {/* Title Input */}
      <FormField
        id={`location-title-${location.sortOrder}`}
        label="Название точки"
        required={isFirst}
        error={error}
        hint={isFirst ? "Обязательное поле" : undefined}
      >
        <Input
          id={`location-title-${location.sortOrder}`}
          value={location.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          disabled={disabled}
          placeholder={isFirst ? "Точка сбора" : "Например: привал, смотровая площадка"}
          className={error ? "border-red-500 focus:border-red-500" : ""}
        />
      </FormField>

      {/* Coordinates Input */}
      <FormField
        id={`location-coords-${location.sortOrder}`}
        label="Координаты"
        error={coordinatesError}
        hint="Decimal Degrees, Google Maps URL, или DMS"
      >
        <div className="flex gap-2">
          <Input
            id={`location-coords-${location.sortOrder}`}
            value={coordinatesInput}
            onChange={(e) => handleCoordinatesChange(e.target.value)}
            onBlur={handleCoordinatesBlur}
            disabled={disabled}
            placeholder="43.238949, 76.889709 или https://maps.google.com/..."
            className={coordinatesError ? "border-red-500 focus:border-red-500" : ""}
          />

          {/* Map Preview Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenMap}
                  disabled={disabled || !hasValidCoordinates}
                  className="h-8 w-8 shrink-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {hasValidCoordinates ? "Показать на карте" : "Введите координаты"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Navigation Chooser */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="shrink-0">
                  <NavigationChooser
                    lat={location.latitude ?? 0}
                    lng={location.longitude ?? 0}
                    disabled={disabled || !hasValidCoordinates}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {hasValidCoordinates ? "Открыть в навигации" : "Введите координаты"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </FormField>

      {/* Map Preview Modal */}
      {hasValidCoordinates && (
        <MapPreviewModal
          isOpen={mapModalOpen}
          onClose={() => setMapModalOpen(false)}
          location={{
            title: location.title,
            lat: location.latitude!,
            lng: location.longitude!,
          }}
        />
      )}
    </FieldCard>
  );
}
