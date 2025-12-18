/**
 * LocationItem Component
 * Single location point input with coordinates parsing, validation, and actions
 */

"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation, Trash2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NavigationChooser } from "./NavigationChooser";
import { MapPreviewModal } from "./MapPreviewModal";
import { parseCoordinates, normalizeCoordinates } from "@/lib/utils/coordinates";
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
        "Неверный формат координат. Используйте формат: 43.238949, 76.889709"
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
    <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF6F2C]/10 text-xs font-semibold text-[#FF6F2C]">
          {index + 1}
        </div>
        <span className="text-sm font-medium text-[#6B7280]">
          {isFirst ? "Точка сбора (обязательная)" : `Точка ${index + 1}`}
        </span>
      </div>

      {/* Title Input */}
      <div className="space-y-2">
        <Label htmlFor={`location-title-${location.sortOrder}`} className="text-sm font-medium text-[#111827]">
          Название точки
        </Label>
        <Input
          id={`location-title-${location.sortOrder}`}
          value={location.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          disabled={disabled}
          placeholder={isFirst ? "Точка сбора" : "Например: привал, смотровая площадка"}
          className={error ? "border-red-500 focus:border-red-500" : ""}
        />
        {error && (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" />
            {error}
          </div>
        )}
      </div>

      {/* Coordinates Input */}
      <div className="space-y-2">
        <Label htmlFor={`location-coords-${location.sortOrder}`} className="text-sm font-medium text-[#111827]">
          Координаты
          <span className="ml-2 text-xs font-normal text-[#6B7280]">
            (Decimal Degrees, Google Maps URL, или DMS)
          </span>
        </Label>
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
                  variant="outline"
                  size="sm"
                  onClick={handleOpenMap}
                  disabled={disabled || !hasValidCoordinates}
                  className="shrink-0"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {hasValidCoordinates ? "Показать на карте" : "Введите координаты"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Navigation Chooser */}
          <NavigationChooser
            lat={location.latitude || 0}
            lng={location.longitude || 0}
            disabled={disabled || !hasValidCoordinates}
            trigger={
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled || !hasValidCoordinates}
                      className="shrink-0"
                    >
                      <Navigation className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasValidCoordinates ? "Открыть в навигации" : "Введите координаты"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            }
          />

          {/* Delete Button */}
          {!isFirst && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onDelete}
                    disabled={disabled}
                    className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Удалить точку</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* First location cannot be deleted */}
          {isFirst && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={true}
                    className="shrink-0 cursor-not-allowed opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Первая точка не может быть удалена
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {coordinatesError && (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" />
            {coordinatesError}
          </div>
        )}
      </div>

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
    </div>
  );
}
