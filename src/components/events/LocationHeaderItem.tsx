/**
 * LocationHeaderItem Component
 * Compact location display for event detail page header
 * Shows first location point with navigation and copy actions
 */

"use client";

import { useState } from "react";
import { MapPin, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NavigationChooser } from "./locations/NavigationChooser";
import { copyCoordinatesToClipboard } from "@/lib/utils/coordinates";
import type { EventLocation } from "@/lib/types/eventLocation";

interface LocationHeaderItemProps {
  location?: EventLocation; // ✅ Optional now
  fallbackText?: string;
}

export function LocationHeaderItem({
  location,
  fallbackText,
}: LocationHeaderItemProps) {
  const [copied, setCopied] = useState(false);
  
  // ✅ Proper validation: check if location exists AND has coordinates
  const hasCoordinates = 
    location !== undefined && 
    location.latitude !== null && 
    location.latitude !== undefined &&
    location.longitude !== null && 
    location.longitude !== undefined;

  const handleCopyCoordinates = async () => {
    if (!hasCoordinates || !location) return;

    const success = await copyCoordinatesToClipboard(
      location.latitude!,
      location.longitude!
    );

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Fallback for old events without locations
  if (!location && fallbackText) {
    return (
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
        <span className="text-base text-muted-foreground">{fallbackText}</span>
      </div>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
      
      {/* Title as clickable link (opens NavigationChooser) */}
      {hasCoordinates ? (
        <>
          <NavigationChooser
            lat={location.latitude!}
            lng={location.longitude!}
            trigger={
              <button
                type="button"
                className="text-base font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors hover:underline"
              >
                {location.title}
              </button>
            }
          />

          {/* Copy Coordinates Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyCoordinates}
                  className="h-6 w-6 shrink-0"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? "Скопировано!" : "Скопировать координаты"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      ) : (
        <span className="text-base text-muted-foreground">{location.title}</span>
      )}
    </div>
  );
}
