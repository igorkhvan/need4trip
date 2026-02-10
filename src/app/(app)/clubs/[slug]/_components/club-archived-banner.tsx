/**
 * ClubArchivedBanner Component
 * 
 * Banner shown when club is archived.
 * Per Visual Contract v6 §4: Banner at top of page, CTA and entry points hidden.
 */

import { Archive } from "lucide-react";

export function ClubArchivedBanner() {
  return (
    <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-danger)] text-white">
          <Archive className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-[var(--color-danger)]">Клуб в архиве</p>
          <p className="text-sm text-[var(--color-danger-text)]">
            Этот клуб больше не принимает новых участников и не проводит события
          </p>
        </div>
      </div>
    </div>
  );
}
