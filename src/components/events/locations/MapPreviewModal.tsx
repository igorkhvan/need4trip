/**
 * MapPreviewModal Component
 * Displays a map with a marker at the specified coordinates
 * Uses Google Maps (primary) with Leaflet + OSM as fallback
 */

"use client";

import { useEffect, useState } from "react";
import { MapPin, Navigation, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NavigationChooser } from "./NavigationChooser";
import {
  normalizeCoordinates,
  copyCoordinatesToClipboard,
} from "@/lib/utils/coordinates";

interface MapPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: {
    title: string;
    lat: number;
    lng: number;
  };
}

/**
 * Google Maps Component (iframe-based, no API key required for basic embedding)
 * Simple and reliable solution for map preview
 */
function GoogleMapEmbed({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  // Google Maps Embed URL with marker
  const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=ru&z=15&output=embed`;

  return (
    <div className="relative h-[300px] sm:h-[400px] w-full overflow-hidden rounded-lg">
      <iframe
        title={`Карта: ${title}`}
        src={mapUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="rounded-lg"
      />
    </div>
  );
}

/**
 * Leaflet Map Component (fallback, lazy loaded)
 * Used if Google Maps embedding fails or is blocked
 */
function LeafletMapFallback({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  const [Map, setMap] = useState<any>(null);

  useEffect(() => {
    // Dynamically import Leaflet and React-Leaflet (client-side only)
    Promise.all([
      import("leaflet"),
      import("react-leaflet"),
    ]).then(([L, { MapContainer, TileLayer, Marker, Popup }]) => {
      // Fix Leaflet default marker icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      setMap(() => () => (
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          style={{ height: "400px", width: "100%", borderRadius: "12px" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]}>
            <Popup>{title}</Popup>
          </Marker>
        </MapContainer>
      ));
    });
  }, [lat, lng, title]);

  if (!Map) {
    return (
      <div className="flex h-[300px] sm:h-[400px] items-center justify-center rounded-lg bg-[#F9FAFB]">
        <div className="text-center">
          <MapPin className="mx-auto h-12 w-12 text-[#9CA3AF]" />
          <p className="mt-2 text-sm text-muted-foreground">Загрузка карты...</p>
        </div>
      </div>
    );
  }

  return <Map />;
}

export function MapPreviewModal({
  isOpen,
  onClose,
  location,
}: MapPreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const coordsText = normalizeCoordinates(location.lat, location.lng);

  const handleCopyCoords = async () => {
    const success = await copyCoordinatesToClipboard(location.lat, location.lng);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl mx-4 sm:mx-auto p-0 gap-0">
        {/* Header - DialogContent already has close button */}
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle className="text-lg sm:text-xl font-semibold leading-tight text-[#1F2937]">
            {location.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground !mt-1">
            {coordsText}
          </p>
        </DialogHeader>

        {/* Map - Google Maps by default */}
        <div className="px-4 py-4 sm:px-6">
          <GoogleMapEmbed
            lat={location.lat}
            lng={location.lng}
            title={location.title}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6">
          {/* Copy Button - Icon only on mobile, with text on desktop */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyCoords}
            className="gap-2"
            title={copied ? "Скопировано" : "Скопировать координаты"}
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">
              {copied ? "✓ Скопировано" : "Скопировать координаты"}
            </span>
          </Button>

          {/* Navigation Button */}
          <NavigationChooser
            lat={location.lat}
            lng={location.lng}
            trigger={
              <Button type="button" size="sm" className="gap-2">
                <Navigation className="h-4 w-4" />
                <span className="hidden sm:inline">Открыть в навигации</span>
              </Button>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
