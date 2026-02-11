/**
 * Centralized JSON-LD Schema Builder
 *
 * Per SSOT_SEO.md §7: Structured Data (NORMATIVE)
 * Per SSOT_SEO.md §14: Structured Data Validation
 *
 * All JSON-LD generation MUST go through this module.
 */

import { getPublicBaseUrl } from "@/lib/config/runtimeConfig";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a possibly-relative URL to an absolute URL.
 * Per SSOT_SEO.md §14.3: JSON-LD MUST use absolute URLs.
 */
export function resolveAbsoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http")) return url;
  const base = getPublicBaseUrl();
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ---------------------------------------------------------------------------
// Event JSON-LD (schema.org/Event)
// ---------------------------------------------------------------------------

export interface EventJsonLdInput {
  title: string;
  slug: string;
  description: string; // plain text (already stripped)
  dateTime: string; // ISO 8601
  visibility: "public" | "unlisted" | "restricted";
  /** First location */
  location?: {
    title: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  /** City info */
  city?: {
    name: string;
    region?: string | null;
  } | null;
  /** Organizer name */
  organizerName?: string | null;
  /** Image URL (club logo or default) */
  imageUrl?: string | null;
  /** Is paid event */
  isPaid?: boolean;
  /** Price (when paid) */
  price?: number | null;
  /** Currency code */
  currencyCode?: string | null;
  /** Is event full */
  isFull?: boolean;
  /** Is free */
  isAccessibleForFree?: boolean;
}

/**
 * Build schema.org/Event JSON-LD.
 * Returns null for restricted events (SSOT §14.3).
 */
export function buildEventJsonLd(
  input: EventJsonLdInput
): Record<string, unknown> | null {
  // Restricted events: no JSON-LD (privacy policy, SSOT §14.3)
  if (input.visibility === "restricted") return null;

  const baseUrl = getPublicBaseUrl();
  const eventUrl = `${baseUrl}/events/${input.slug}`;
  const image = resolveAbsoluteUrl(input.imageUrl) || `${baseUrl}/og-default.png`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.title,
    description: input.description,
    startDate: input.dateTime,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image,
    url: eventUrl,
  };

  // Location
  if (input.location) {
    const place: Record<string, unknown> = {
      "@type": "Place",
      name: input.location.title,
    };
    if (input.city) {
      place.address = {
        "@type": "PostalAddress",
        addressLocality: input.city.name,
        ...(input.city.region && { addressRegion: input.city.region }),
        addressCountry: "KZ",
      };
    }
    if (input.location.latitude && input.location.longitude) {
      place.geo = {
        "@type": "GeoCoordinates",
        latitude: input.location.latitude,
        longitude: input.location.longitude,
      };
    }
    jsonLd.location = place;
  }

  // Organizer
  if (input.organizerName) {
    jsonLd.organizer = {
      "@type": "Person",
      name: input.organizerName,
    };
  }

  // Offers (paid events)
  if (input.isPaid && input.price != null) {
    jsonLd.offers = {
      "@type": "Offer",
      price: input.price,
      priceCurrency: input.currencyCode || "KZT",
      availability: input.isFull
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
      url: eventUrl,
    };
  }

  // Free events
  if (!input.isPaid) {
    jsonLd.isAccessibleForFree = true;
  }

  return jsonLd;
}

// ---------------------------------------------------------------------------
// Organization JSON-LD (schema.org/Organization)
// ---------------------------------------------------------------------------

export interface ClubJsonLdInput {
  name: string;
  slug: string;
  description?: string | null; // plain text
  logoUrl?: string | null;
  visibility: "public" | "private";
  cities?: Array<{ name: string }>;
  /** Social / external links */
  sameAs?: (string | null | undefined)[];
}

/**
 * Build schema.org/Organization JSON-LD for a club.
 * Private clubs get minimal JSON-LD (name + url only, per SSOT §14.3).
 */
export function buildClubJsonLd(
  input: ClubJsonLdInput
): Record<string, unknown> {
  const baseUrl = getPublicBaseUrl();
  const clubUrl = `${baseUrl}/clubs/${input.slug}`;

  // Private clubs: minimal (SSOT §14.3)
  if (input.visibility === "private") {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: input.name,
      url: clubUrl,
    };
  }

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: clubUrl,
  };

  if (input.description) {
    jsonLd.description = input.description;
  }

  if (input.logoUrl) {
    jsonLd.logo = resolveAbsoluteUrl(input.logoUrl);
  }

  if (input.cities && input.cities.length > 0) {
    jsonLd.address = input.cities.map((city) => ({
      "@type": "PostalAddress",
      addressLocality: city.name,
      addressCountry: "KZ",
    }));
  }

  const sameAs = (input.sameAs ?? []).filter(Boolean) as string[];
  if (sameAs.length > 0) {
    jsonLd.sameAs = sameAs;
  }

  return jsonLd;
}
