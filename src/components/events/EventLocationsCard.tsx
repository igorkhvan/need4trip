/**
 * EventLocationsCard Component
 * Displays all location points for an event
 * Used on event detail page sidebar
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationPointDisplay } from "./LocationPointDisplay";
import type { EventLocation } from "@/lib/types/eventLocation";

interface EventLocationsCardProps {
  locations: EventLocation[];
}

function getPointsLabel(count: number): string {
  if (count === 1) return "точка";
  if (count >= 2 && count <= 4) return "точки";
  return "точек";
}

export function EventLocationsCard({ locations }: EventLocationsCardProps) {
  if (!locations || locations.length === 0) {
    return null;
  }

  // Sort by sortOrder
  const sortedLocations = [...locations].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Точки маршрута</CardTitle>
        {locations.length > 1 && (
          <CardDescription>
            {locations.length} {getPointsLabel(locations.length)}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedLocations.map((location, index) => (
          <LocationPointDisplay
            key={location.id || location.sortOrder}
            location={location}
            index={index}
            compact={true}
          />
        ))}
      </CardContent>
    </Card>
  );
}
