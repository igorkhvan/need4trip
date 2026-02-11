/**
 * Pricing Page — Server Component
 *
 * Fetches plans server-side for SEO (bots see full content).
 * ISR with 5-minute revalidation (matches planRepo cache TTL).
 *
 * Per SSOT_SEO.md §4.1: indexable pages MUST be server-rendered
 * Per SSOT_SEO.md §4.2: ISR recommended for pricing
 * Per SSOT_SEO.md §5.3: noindex during beta
 * Per SSOT_SEO.md §6.1: required metadata fields
 */

import type { Metadata } from "next";
import { listPublicPlans } from "@/lib/db/planRepo";
import { PricingPageClient } from "@/components/pricing/pricing-page-client";
import type { PricingPlan } from "@/lib/types/billing";
import { buildStaticPageMetadata } from "@/lib/seo/metadataBuilder";

export const revalidate = 300; // ISR: 5 minutes (matches planRepo cache TTL)

export const metadata: Metadata = buildStaticPageMetadata({
  title: "Тарифы Need4Trip",
  description:
    "Тарифы и планы для автомобильных клубов на Need4Trip — от бесплатного до безлимитного. Выберите подходящий тариф.",
  canonicalPath: "/pricing",
  ogImageAlt: "Тарифы — Need4Trip",
  robots: {
    index: false,
    follow: true,
  },
});

export default async function PricingPage() {
  let plans: PricingPlan[] = [];
  
  try {
    const dbPlans = await listPublicPlans();
    // Map ClubPlan → PricingPlan (subset of fields)
    plans = dbPlans.map((p) => ({
      id: p.id,
      title: p.title,
      priceMonthly: p.priceMonthly,
      currencyCode: p.currencyCode,
      maxMembers: p.maxMembers,
      maxEventParticipants: p.maxEventParticipants,
      allowPaidEvents: p.allowPaidEvents,
      allowCsvExport: p.allowCsvExport,
    }));
  } catch {
    // Fallback: client component will fetch from API
  }

  return <PricingPageClient initialPlans={plans} />;
}
