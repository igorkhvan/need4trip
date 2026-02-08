import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Home, Trash2 } from "lucide-react";

/**
 * Page shown when a user opens a link to a soft-deleted event.
 * 
 * UX rationale: Instead of a generic 404, give the user a clear
 * explanation that the event was deleted by its organizer.
 * No event data is leaked (title, description, etc.).
 */
export function EventDeletedPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-danger-bg)]">
          <Trash2 className="h-10 w-10 text-[var(--color-danger)]" />
        </div>

        <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-3">
          Событие удалено
        </h1>

        <p className="text-base text-muted-foreground mb-8 max-w-md">
          Это событие было удалено организатором
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <BackButton
            variant="outline"
            size="lg"
            fallbackHref="/events"
            className="flex items-center gap-2"
          />

          <Button size="lg" asChild>
            <Link href="/events" className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              К списку событий
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
