/**
 * Dynamic Sitemap
 * 
 * Per SSOT_SEO.md §3.3: Dynamic sitemap generation for crawlers.
 * 
 * Included:
 * - Static pages (/, /events, /clubs, /pricing)
 * - Public event detail pages (/events/[slug])
 * - Public club detail pages (/clubs/[slug])
 * 
 * Excluded:
 * - Private/restricted events (visibility !== 'public')
 * - Soft-deleted events
 * - Admin pages
 * - Auth pages
 * - Profile pages
 */

import type { MetadataRoute } from "next";
import { getAdminDbSafe } from "@/lib/db/client";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://need4trip.kz";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getAdminDbSafe();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/clubs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];

  if (!db) {
    return staticPages;
  }

  // Public events (not deleted, public visibility)
  const { data: events } = await db
    .from("events")
    .select("slug, updated_at")
    .eq("visibility", "public")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1000);

  const eventPages: MetadataRoute.Sitemap = (events ?? []).map((e) => ({
    url: `${BASE_URL}/events/${e.slug}`,
    lastModified: new Date(e.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // Public clubs (not archived)
  const { data: clubs } = await db
    .from("clubs")
    .select("slug, updated_at")
    .eq("visibility", "public")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  const clubPages: MetadataRoute.Sitemap = (clubs ?? []).map((c) => ({
    url: `${BASE_URL}/clubs/${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...eventPages, ...clubPages];
}
