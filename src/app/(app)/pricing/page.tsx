/**
 * Pricing Page — Server Component wrapper
 *
 * Provides metadata for SEO. Client component handles data fetching and UI.
 *
 * Per SSOT_SEO.md §5.3: noindex during beta
 * Per SSOT_SEO.md §6.1: required metadata fields
 */

import type { Metadata } from "next";
import { PricingPageClient } from "@/components/pricing/pricing-page-client";

export const metadata: Metadata = {
  title: "Тарифы Need4Trip",
  description: "Тарифы и планы для автомобильных клубов на Need4Trip — от бесплатного до безлимитного",
  robots: {
    index: false,
    follow: true,
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
