/**
 * LocationPointDisplay Component (Read-Only)
 * Displays a single location point with navigation and copy actions
 * Used on event detail page
 */

"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface LocationPointDisplayProps {
  location: EventLocation;
  index: number;
  compact?: boolean;
  className?: string;
}

export function LocationPointDisplay({
  location,
  index,
  compact = false,
  className,
}: LocationPointDisplayProps) {
  const [copied, setCopied] = useState(false);
  const hasCoordinates = location.latitude !== null && location.longitude !== null;

  const handleCopyCoordinates = async () => {
    if (!hasCoordinates) return;

    const success = await copyCoordinatesToClipboard(
      location.latitude!,
      location.longitude!
    );

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3",
        compact && "p-2.5",
        className
      )}
    >
      {/* Number Badge */}
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF6F2C]/10 text-xs font-semibold text-[#FF6F2C]">
        {index + 1}
      </div>

      {/* Location Title + Actions */}
      <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
        {/* Title as clickable link (opens NavigationChooser) */}
        {hasCoordinates ? (
          <NavigationChooser
            lat={location.latitude!}
            lng={location.longitude!}
            trigger={
              <button
                type="button"
                className="flex-1 text-left text-sm font-semibold text-[#1F2937] hover:text-[#FF6F2C] transition-colors truncate"
              >
                {location.title}
              </button>
            }
          />
        ) : (
          <span className="flex-1 text-sm font-semibold text-muted-foreground truncate">
            {location.title}
          </span>
        )}

        {/* Copy Coordinates Button */}
        {hasCoordinates && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyCoordinates}
                  className="h-7 w-7 shrink-0"
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
        )}
      </div>
    </div>
  );
}
