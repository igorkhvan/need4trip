/**
 * ClubArchivedBanner Component
 * 
 * Banner shown when club is archived.
 * Per Visual Contract v2 §6.2: Banner at top of page, all other sections read-only.
 */

import { Archive, AlertTriangle } from "lucide-react";

export function ClubArchivedBanner() {
  return (
    <div className="rounded-xl border border-[#FEF2F2] bg-[#FEF2F2] p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DC2626] text-white">
          <Archive className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-[#DC2626]">Клуб в архиве</p>
          <p className="text-sm text-[#7F1D1D]">
            Этот клуб больше не принимает новых участников и не проводит события
          </p>
        </div>
      </div>
    </div>
  );
}
