/**
 * ClubAboutSection Component
 * 
 * About section for Club Profile page.
 * Per Visual Contract v6 §7: Read-only.
 * Displays: description, cities, external links (handled in header).
 * No edit affordances.
 */

import { MapPin, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CityHydrated } from "@/lib/types/city";

interface ClubAboutSectionProps {
  description: string | null;
  cities?: CityHydrated[];
}

export function ClubAboutSection({ description, cities }: ClubAboutSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="space-y-6">
        {/* Cities */}
        {cities && cities.length > 0 && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-[18px] font-semibold text-[var(--color-text)]">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span>Города клуба</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <Badge key={city.id} variant="secondary" size="md">
                  {city.region ? `${city.name}, ${city.region}` : city.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-[18px] font-semibold text-[var(--color-text)]">
            <Info className="h-5 w-5 text-muted-foreground" />
            <span>О клубе</span>
          </h2>
          {description ? (
            <p className="whitespace-pre-wrap text-[15px] text-[var(--color-text)]">
              {description}
            </p>
          ) : (
            <p className="text-[15px] text-muted-foreground italic">
              Описание клуба не указано
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
