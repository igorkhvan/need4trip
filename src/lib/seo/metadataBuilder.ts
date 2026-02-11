/**
 * Centralized Metadata Builder
 *
 * Per SSOT_SEO.md §13: Metadata Patterns (NORMATIVE)
 * Per SSOT_SEO.md §15: Canonical Stability Rule (NORMATIVE)
 * Per SSOT_SEO.md §17: Pagination Canonical Policy (NORMATIVE)
 * Per SSOT_SEO.md §18: Query Parameter Normalization (NORMATIVE)
 *
 * This module is the SINGLE place where Next.js Metadata objects are built.
 * Page-level `generateMetadata` functions MUST delegate to helpers here.
 */

import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const DEFAULT_OG_IMAGE = "/og-default.png";
const DESCRIPTION_MAX = 200;
const DESCRIPTION_IDEAL_MIN = 120;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Truncate description to a max length, preserving word boundaries.
 * Per SSOT_SEO.md §13.2: 120–160 chars ideal, 200 hard max.
 */
export function truncateDescription(text: string, max: number = DESCRIPTION_MAX): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > DESCRIPTION_IDEAL_MIN ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

// ---------------------------------------------------------------------------
// Static Page Metadata
// ---------------------------------------------------------------------------

export interface StaticPageMetadataInput {
  /** Page title (without site suffix — template adds it) */
  title: string;
  /** Meta description */
  description: string;
  /** Canonical path, e.g. "/" or "/events" (no trailing slash except "/") */
  canonicalPath: string;
  /** Override OG image (defaults to /og-default.png) */
  ogImage?: string;
  /** Override OG image alt text */
  ogImageAlt?: string;
  /** robots override — defaults to index/follow */
  robots?: Metadata["robots"];
}

/**
 * Build metadata for a static page (homepage, /events, /clubs, /pricing).
 */
export function buildStaticPageMetadata(input: StaticPageMetadataInput): Metadata {
  const { title, description, canonicalPath, robots } = input;
  const ogImage = input.ogImage || DEFAULT_OG_IMAGE;
  const ogImageAlt = input.ogImageAlt || `${title} — Need4Trip`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImage,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    ...(robots ? { robots } : {}),
  };
}

// ---------------------------------------------------------------------------
// Pagination Canonical
// ---------------------------------------------------------------------------

/**
 * Build canonical path for paginated listing pages.
 *
 * Per SSOT_SEO.md §17.1:
 * - page=1 (or absent) → "/events"
 * - page=2+ → "/events?page=2"
 *
 * Per §18.2: non-SEO params (tab, sort, search, cityId, etc.) stripped.
 */
export function buildPaginationCanonical(basePath: string, page: number | undefined): string {
  if (!page || page <= 1) return basePath;
  return `${basePath}?page=${page}`;
}

// ---------------------------------------------------------------------------
// Event Detail Metadata
// ---------------------------------------------------------------------------

export interface EventMetadataInput {
  /** Event title */
  title: string;
  /** Event slug */
  slug: string;
  /** Plain-text description (already stripped of HTML) */
  plainDescription: string;
  /** City name (optional) */
  cityName?: string | null;
  /** Formatted date/time string */
  dateFormatted?: string | null;
  /** Current participant count */
  participantsCount?: number;
  /** Max participants (null = unlimited) */
  maxParticipants?: number | null;
  /** OG image URL (club logo, event image, etc.) */
  ogImage?: string | null;
  /** Event visibility */
  visibility: "public" | "unlisted" | "restricted";
}

/**
 * Build metadata for an event detail page.
 *
 * Per SSOT_SEO.md §13.1: title pattern "{Event Title} — {City}"
 * Per SSOT_SEO.md §13.2: description includes city, date, participants
 * Per SSOT_SEO.md §13.3: OG/Twitter align with page metadata
 */
export function buildEventMetadata(input: EventMetadataInput): Metadata {
  // Restricted events: minimal metadata (SSOT §14.3)
  if (input.visibility === "restricted") {
    return {
      title: "Событие на Need4Trip",
      description: "Это событие доступно только по приглашению.",
      openGraph: {
        title: "Событие на Need4Trip",
        description: "Это событие доступно только по приглашению.",
      },
    };
  }

  // Title: "{Event Title} — {City}" per SSOT §13.1
  const titleParts = [input.title];
  if (input.cityName) titleParts.push(input.cityName);
  const title = titleParts.join(" — ");

  // Description: date · city · participants — {description}
  const metaParts: string[] = [];
  if (input.dateFormatted) metaParts.push(input.dateFormatted);
  if (input.cityName) metaParts.push(input.cityName);
  const participantsInfo = input.maxParticipants
    ? `${input.participantsCount ?? 0}/${input.maxParticipants} участников`
    : `${input.participantsCount ?? 0} участников`;
  metaParts.push(participantsInfo);
  const metaPrefix = metaParts.join(" · ");
  const fullDescription = input.plainDescription
    ? `${metaPrefix} — ${input.plainDescription}`
    : metaPrefix;
  const description = truncateDescription(fullDescription);

  const ogImage = input.ogImage || DEFAULT_OG_IMAGE;
  const canonicalPath = `/events/${input.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      type: "article",
      images: [
        {
          url: ogImage,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: `${input.title} — Need4Trip`,
        },
      ],
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// ---------------------------------------------------------------------------
// Club Detail Metadata
// ---------------------------------------------------------------------------

export interface ClubMetadataInput {
  /** Club name */
  name: string;
  /** Club slug */
  slug: string;
  /** Plain-text description */
  description?: string | null;
  /** City names (club can have multiple cities) */
  cityNames?: string[];
  /** Total member count */
  memberCount?: number;
  /** Upcoming event count */
  upcomingEventCount?: number;
  /** OG image URL (club logo) */
  ogImage?: string | null;
  /** Club visibility */
  visibility: "public" | "private";
}

/**
 * Build metadata for a club detail page.
 *
 * Per SSOT_SEO.md §13.1: title pattern "{Club Name} — Автоклуб в {City}"
 * Per SSOT_SEO.md §13.3: OG/Twitter align with page metadata
 * Per SSOT_SEO.md §14.3: private clubs get minimal metadata
 */
export function buildClubMetadata(input: ClubMetadataInput): Metadata {
  const ogImage = input.ogImage || DEFAULT_OG_IMAGE;
  const canonicalPath = `/clubs/${input.slug}`;

  // Private clubs: name + canonical + minimal description
  if (input.visibility === "private") {
    const privateDescription =
      "Закрытый клуб на Need4Trip. Вступите, чтобы увидеть события и участников.";
    return {
      title: input.name,
      description: privateDescription,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title: input.name,
        description: privateDescription,
        images: [
          {
            url: ogImage,
            width: OG_IMAGE_WIDTH,
            height: OG_IMAGE_HEIGHT,
            alt: `${input.name} — Need4Trip`,
          },
        ],
        url: canonicalPath,
      },
      twitter: {
        card: "summary_large_image",
        title: input.name,
        description: privateDescription,
        images: [ogImage],
      },
    };
  }

  // Public clubs: full metadata
  const citiesText = input.cityNames?.length
    ? input.cityNames.join(", ")
    : null;

  // Title: "{Club Name} — Автоклуб в {City}" per SSOT §13.1
  const title = citiesText
    ? `${input.name} — Автоклуб в ${citiesText}`
    : input.name;

  // Description
  const baseDesc = input.description
    ? truncateDescription(input.description, 160)
    : "Автомобильный клуб на Need4Trip";

  const metaParts: string[] = [];
  if (citiesText) metaParts.push(citiesText);
  if (input.memberCount !== undefined) metaParts.push(`${input.memberCount} участников`);
  if (input.upcomingEventCount !== undefined) metaParts.push(`${input.upcomingEventCount} событий`);
  const metaPrefix = metaParts.join(" · ");
  const fullDescription = metaPrefix ? `${metaPrefix} — ${baseDesc}` : baseDesc;
  const description = truncateDescription(fullDescription);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImage,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: `${input.name} — Need4Trip`,
        },
      ],
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
