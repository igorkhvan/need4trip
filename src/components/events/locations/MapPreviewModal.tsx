/**
 * MapPreviewModal Component
 * Displays a map with a marker at the specified coordinates
 * Uses Leaflet + OpenStreetMap (free, no API key required)
 */

"use client";

import { useEffect, useState } from "react";
import { MapPin, Navigation, Copy, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
 * Leaflet Map Component (lazy loaded for better performance)
 * Renders only on client-side
 */
function LeafletMap({ lat, lng, title }: { lat: number; lng: number; title: string }) {
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
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="text-center">
          <MapPin className="mx-auto h-12 w-12 text-[#9CA3AF]" />
          <p className="mt-2 text-sm text-[#6B7280]">Загрузка карты...</p>
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

  // Load Leaflet CSS dynamically
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      // Check if CSS is already loaded
      const existingLink = document.getElementById("leaflet-css");
      if (!existingLink) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0">
        {/* Header */}
        <DialogHeader className="border-b border-[#E5E7EB] px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-[#111827]">
                {location.title}
              </DialogTitle>
              <p className="mt-1 text-sm text-[#6B7280]">{coordsText}</p>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Закрыть</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {/* Map */}
        <div className="px-6 pt-4">
          <LeafletMap
            lat={location.lat}
            lng={location.lng}
            title={location.title}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-[#E5E7EB] px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyCoords}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            {copied ? "✓ Скопировано" : "Скопировать координаты"}
          </Button>

          <NavigationChooser
            lat={location.lat}
            lng={location.lng}
            trigger={
              <Button type="button" size="sm" className="gap-2">
                <Navigation className="h-4 w-4" />
                Открыть в навигации
              </Button>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
