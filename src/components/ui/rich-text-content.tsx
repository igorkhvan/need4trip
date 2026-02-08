/**
 * RichTextContent - Sanitized HTML renderer for rich text content
 *
 * Features:
 * - Sanitizes HTML via lightweight allowlist-based sanitizer (no DOM dependency)
 * - Works in any runtime: Node.js, Edge, Browser (no jsdom required)
 * - Backward compatible: renders plain text (no HTML tags) with auto paragraph conversion
 * - Styled with Tailwind prose classes for consistent typography
 *
 * SSOT: docs/ssot/SSOT_DESIGN_SYSTEM.md (RichTextContent section)
 */

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RichTextContentProps {
  /** HTML or plain text string to render */
  html: string;
  /** Extra className for the wrapper */
  className?: string;
}

// ---------------------------------------------------------------------------
// Lightweight HTML Sanitizer (no DOM dependency)
// ---------------------------------------------------------------------------

/** Allowed tags for sanitization (basic formatting only) */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "a",
  "span",
]);

/** Allowed attributes per tag */
const ALLOWED_ATTR_MAP: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "class"]),
  span: new Set(["class"]),
};

/** Safe URL protocols for href */
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/**
 * Sanitize an HTML string by stripping disallowed tags and attributes.
 * Uses regex-based parsing — safe for our narrow allowlist.
 *
 * This intentionally avoids DOMPurify/jsdom dependency to work in
 * Vercel serverless / Edge / Node.js without native modules.
 */
function sanitizeHtml(html: string): string {
  // Match HTML tags (opening, closing, self-closing)
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)?\/?>/g, (match, tagName: string, attrs: string | undefined) => {
    const tag = tagName.toLowerCase();

    // Strip disallowed tags entirely (remove tag but keep inner text)
    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    // Closing tag — no attributes needed
    if (match.startsWith("</")) {
      return `</${tag}>`;
    }

    // Self-closing (like <br /> or <br>)
    if (tag === "br") {
      return "<br>";
    }

    // Parse and filter attributes
    const allowedAttrs = ALLOWED_ATTR_MAP[tag];
    if (!allowedAttrs || !attrs?.trim()) {
      return `<${tag}>`;
    }

    // Extract safe attributes
    const safeAttrs: string[] = [];
    const attrRegex = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";

      if (!allowedAttrs.has(attrName)) continue;

      // Validate href for safe protocols
      if (attrName === "href") {
        // Block javascript:, data:, vbscript: etc
        const trimmedHref = attrValue.trim().toLowerCase();
        if (trimmedHref.startsWith("javascript:") || trimmedHref.startsWith("data:") || trimmedHref.startsWith("vbscript:")) {
          continue;
        }
        // Check protocol if present
        try {
          const url = new URL(attrValue, "https://placeholder.local");
          if (!SAFE_PROTOCOLS.has(url.protocol)) continue;
        } catch {
          // Relative URL — allow
        }
      }

      // Escape attribute value
      const escapedValue = attrValue
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      safeAttrs.push(`${attrName}="${escapedValue}"`);
    }

    return safeAttrs.length > 0
      ? `<${tag} ${safeAttrs.join(" ")}>`
      : `<${tag}>`;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a string looks like it contains HTML tags.
 * Used to determine if we should render as HTML or plain text.
 */
function containsHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/**
 * Convert plain text with newlines into simple HTML paragraphs.
 */
function plainTextToHtml(text: string): string {
  return text
    .split(/\n\n+/)
    .map((paragraph) => {
      const lines = paragraph
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br>");
      return `<p>${lines}</p>`;
    })
    .join("");
}

/** Basic HTML escaping for plain text content */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RichTextContent({ html, className }: RichTextContentProps) {
  if (!html || !html.trim()) {
    return null;
  }

  // Determine if content is HTML or plain text
  const isHtml = containsHtml(html);

  // Convert plain text to HTML if needed (backward compat)
  const rawHtml = isHtml ? html : plainTextToHtml(html);

  // Sanitize using lightweight allowlist-based sanitizer
  const sanitized = sanitizeHtml(rawHtml);

  return (
    <div
      className={cn(
        "rich-text-content",
        "text-base leading-relaxed text-[var(--color-text)]",
        // Prose-like styles for formatted content
        "[&_p]:my-1.5 first:[&_p]:mt-0 last:[&_p]:mb-0",
        "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-0.5",
        "[&_a]:text-[var(--color-primary)] [&_a]:underline [&_a]:break-all",
        "[&_strong]:font-semibold",
        "[&_em]:italic",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
