/**
 * Dynamic Sitemap
 *
 * Per SSOT_SEO.md §3.3: Dynamic sitemap generation for crawlers.
 * Per SSOT_SEO.md §16.1: only indexable pages go in sitemap.
 * Per SSOT_SEO.md §16.4: batched pagination for entity queries.
 *
 * Included:
 * - Static pages (/, /events)
 * - Public event detail pages (/events/[slug])
 * - Public club detail pages (/clubs/[slug])
 *
 * Excluded (noindex during beta):
 * - /clubs, /pricing — per SSOT §5.3/§5.4
 *
 * Also excluded:
 * - Private/restricted events (visibility !== 'public')
 * - Soft-deleted events
 * - Admin, auth, profile pages
 */

import type { MetadataRoute } from "next";
import { getAdminDbSafe } from "@/lib/db/client";
import { getPublicBaseUrl } from "@/lib/config/runtimeConfig";

const PAGE_SIZE = 500;
const MAX_ENTITIES = 50_000; // safety limit to prevent infinite loop

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicBaseUrl();
  const db = getAdminDbSafe();

  // Static pages — only indexable per SSOT §5.1
  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  if (!db) return entries;

  // --- Batched: public events ---
  let offset = 0;
  let total = 0;
  while (total < MAX_ENTITIES) {
    const { data } = await db
      .from("events")
      .select("slug, updated_at")
      .eq("visibility", "public")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const batch = data ?? [];
    for (const e of batch) {
      entries.push({
        url: `${baseUrl}/events/${e.slug}`,
        lastModified: new Date(e.updated_at),
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
    total += batch.length;
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  // --- Batched: public clubs ---
  offset = 0;
  total = 0;
  while (total < MAX_ENTITIES) {
    const { data } = await db
      .from("clubs")
      .select("slug, updated_at")
      .eq("visibility", "public")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const batch = data ?? [];
    for (const c of batch) {
      entries.push({
        url: `${baseUrl}/clubs/${c.slug}`,
        lastModified: new Date(c.updated_at),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
    total += batch.length;
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return entries;
}
