/**
 * NavigationChooser Component
 * Popover menu to choose navigation app or copy coordinates
 */

"use client";

import { useState } from "react";
import { MapPin, Navigation, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  generateNavigationUrls,
  copyCoordinatesToClipboard,
  normalizeCoordinates,
} from "@/lib/utils/coordinates";

interface NavigationChooserProps {
  lat: number;
  lng: number;
  trigger?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

const navigationServices = [
  {
    id: 'google',
    name: 'Google Maps',
    icon: '🗺️',
    urlKey: 'googleMaps' as const,
  },
  {
    id: 'apple',
    name: 'Apple Maps',
    icon: '🍎',
    urlKey: 'appleMaps' as const,
  },
  {
    id: 'yandex',
    name: 'Яндекс Карты',
    icon: '🅰️',
    urlKey: 'yandexMaps' as const,
  },
  {
    id: '2gis',
    name: '2ГИС',
    icon: '🗂️',
    urlKey: 'twogis' as const,
  },
];

export function NavigationChooser({
  lat,
  lng,
  trigger,
  disabled = false,
  className,
}: NavigationChooserProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const urls = generateNavigationUrls(lat, lng);
  const coordsText = normalizeCoordinates(lat, lng);

  const handleNavigate = (service: typeof navigationServices[number]) => {
    const url = urls[service.urlKey];
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const handleCopyCoords = async () => {
    const success = await copyCoordinatesToClipboard(lat, lng);
    if (success) {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    }
  };

  const defaultTrigger = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      className={className}
    >
      <Navigation className="h-4 w-4" />
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="space-y-1">
          {/* Header */}
          <div className="px-2 py-1.5">
            <p className="text-xs font-semibold text-[#111827]">Открыть в навигации</p>
            <p className="text-xs text-[#6B7280]">{coordsText}</p>
          </div>

          {/* Divider */}
          <div className="border-t border-[#E5E7EB]" />

          {/* Navigation Services */}
          {navigationServices.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => handleNavigate(service)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors"
            >
              <span className="text-lg">{service.icon}</span>
              <span className="flex-1 text-left">{service.name}</span>
              <ExternalLink className="h-3.5 w-3.5 text-[#9CA3AF]" />
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-[#E5E7EB]" />

          {/* Copy Coordinates */}
          <button
            type="button"
            onClick={handleCopyCoords}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#374151] hover:bg-[#F9FAFB] transition-colors"
          >
            <Copy className="h-4 w-4 text-[#6B7280]" />
            <span className="flex-1 text-left">
              {copied ? '✓ Скопировано!' : 'Скопировать координаты'}
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
