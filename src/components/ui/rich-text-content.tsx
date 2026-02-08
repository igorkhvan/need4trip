/**
 * RichTextContent - Sanitized HTML renderer for rich text content
 *
 * Features:
 * - Sanitizes HTML via DOMPurify (XSS protection)
 * - Backward compatible: renders plain text (no HTML tags) with whitespace-pre-line
 * - Styled with Tailwind prose classes for consistent typography
 *
 * SSOT: docs/ssot/SSOT_DESIGN_SYSTEM.md (RichTextContent section)
 */

import DOMPurify from "isomorphic-dompurify";
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
// Helpers
// ---------------------------------------------------------------------------

/** Allowed tags for sanitization (basic formatting only) */
const ALLOWED_TAGS = [
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
];

/** Allowed attributes */
const ALLOWED_ATTR = ["href", "target", "rel", "class"];

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

  // Sanitize
  const sanitized = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });

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
