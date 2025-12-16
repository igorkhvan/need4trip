/**
 * EventParticipantsSkeleton Component
 * 
 * Skeleton для карточки участников события.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticipantsTableSkeleton } from "./table-skeleton";

export function EventParticipantsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-7 w-48 animate-pulse rounded bg-[#F7F7F8]" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded bg-[#F7F7F8]" />
      </CardHeader>
      <CardContent>
        <ParticipantsTableSkeleton rowsCount={8} />
      </CardContent>
    </Card>
  );
}
