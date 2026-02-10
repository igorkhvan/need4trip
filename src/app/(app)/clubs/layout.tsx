/**
 * Clubs Layout
 *
 * Provides static metadata for the clubs listing page.
 * Needed because clubs/page.tsx is a Client Component
 * and cannot export metadata directly.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Per SSOT_SEO.md §5.3: listing pages noindex during beta
 */
export const metadata: Metadata = {
  title: "Клубы",
  description: "Автомобильные клубы на Need4Trip — найдите единомышленников",
  robots: {
    index: false,
    follow: true,
  },
};

export default function ClubsLayout({ children }: { children: ReactNode }) {
  return children;
}
