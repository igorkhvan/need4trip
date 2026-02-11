/**
 * Clubs Layout
 *
 * Provides static metadata for the clubs listing page.
 * Needed because clubs/page.tsx is a Client Component
 * and cannot export metadata directly.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildStaticPageMetadata } from "@/lib/seo/metadataBuilder";

/**
 * Per SSOT_SEO.md §5.3: listing pages noindex during beta.
 * Canonical and OG/Twitter still included for correctness.
 */
export const metadata: Metadata = buildStaticPageMetadata({
  title: "Клубы",
  description:
    "Автомобильные клубы на Need4Trip — найдите единомышленников и присоединяйтесь к автомобильному сообществу Казахстана.",
  canonicalPath: "/clubs",
  ogImageAlt: "Клубы — Need4Trip",
  robots: {
    index: false,
    follow: true,
  },
});

export default function ClubsLayout({ children }: { children: ReactNode }) {
  return children;
}
