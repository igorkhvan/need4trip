import type { MetadataRoute } from "next";
import { getPublicBaseUrl } from "@/lib/config/runtimeConfig";

/**
 * Dynamic robots.txt generation
 *
 * Per SSOT_SEO.md §5.2:
 * - Allow crawling of public entity pages
 * - Disallow API, admin, and auth-only routes
 * - Reference sitemap
 *
 * @see docs/ssot/SSOT_SEO.md §5.2
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/events/", "/clubs/"],
        disallow: [
          "/api/",
          "/admin/",
          "/profile/",
          "/profile/edit",
          "/events/create",
          "/clubs/create",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
