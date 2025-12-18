/**
 * Detect if event locations have changed
 * Returns true if locations were added, removed, or modified
 */
import type { EventLocation } from "@/lib/types/eventLocation";

export function detectLocationChanges(
  oldLocations: EventLocation[],
  newLocations: EventLocation[]
): boolean {
  // Different number of locations = changed
  if (oldLocations.length !== newLocations.length) {
    return true;
  }

  // Sort by sortOrder for comparison
  const oldSorted = [...oldLocations].sort((a, b) => a.sortOrder - b.sortOrder);
  const newSorted = [...newLocations].sort((a, b) => a.sortOrder - b.sortOrder);

  // Compare each location
  for (let i = 0; i < oldSorted.length; i++) {
    const oldLoc = oldSorted[i];
    const newLoc = newSorted[i];

    // Check if any key properties changed
    if (
      oldLoc.title !== newLoc.title ||
      oldLoc.latitude !== newLoc.latitude ||
      oldLoc.longitude !== newLoc.longitude ||
      oldLoc.sortOrder !== newLoc.sortOrder
    ) {
      return true;
    }
  }

  return false;
}
