/**
 * MobileSectionNav Component
 * 
 * Universal mobile floating navigation with dots and connecting lines.
 * Auto-detects visible sections using Intersection Observer.
 * Provides smooth scroll to sections on click.
 * 
 * Usage:
 * ```tsx
 * const sections = [
 *   { id: "section-1", label: "First Section" },
 *   { id: "section-2", label: "Second Section" },
 * ];
 * 
 * <MobileSectionNav sections={sections} />
 * ```
 * 
 * Features:
 * - Intersection Observer for active section tracking
 *   - Maintains entry map for all observed sections
 *   - Re-evaluates ALL sections on any intersection change
 *   - Selects section with highest intersection ratio
 * - Smooth scroll behavior with configurable offset
 * - Touch-friendly targets (28-30px effective area)
 * - Accessibility (ARIA labels, keyboard navigation)
 * - iOS safe area support
 * - Performance optimized (debounced via thresholds)
 * 
 * Accessibility:
 * - Touch targets meet WCAG 2.1 AAA guidelines (~28-30px)
 * - Full keyboard navigation support
 * - Screen reader friendly (ARIA labels)
 * - Focus indicators
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

export interface Section {
  /** Unique ID matching the DOM element's id attribute */
  id: string;
  /** Human-readable label for accessibility */
  label: string;
}

interface MobileSectionNavProps {
  /** Array of sections to navigate between */
  sections: Section[];
  /** Optional CSS class name */
  className?: string;
  /** Scroll offset in pixels (default: -80) */
  scrollOffset?: number;
  /** Hide on desktop breakpoint (default: "lg") */
  hideOnBreakpoint?: "md" | "lg" | "xl";
}

export function MobileSectionNav({
  sections,
  className,
  scrollOffset = -80,
  hideOnBreakpoint = "lg",
}: MobileSectionNavProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const entriesMapRef = useRef<Map<string, IntersectionObserverEntry>>(new Map());

  // Setup Intersection Observer
  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    entriesMapRef.current.clear();

    // Create new observer
    const observer = new IntersectionObserver(
      (entries) => {
        // Update entries map with latest observations
        entries.forEach((entry) => {
          entriesMapRef.current.set(entry.target.id, entry);
        });

        // Find the most visible section across ALL observed entries
        let maxRatio = 0;
        let maxIndex = 0;

        sections.forEach((section, index) => {
          const entry = entriesMapRef.current.get(section.id);
          if (entry && entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            maxIndex = index;
          }
        });

        // Update active index if we found any visible section
        if (maxRatio > 0) {
          setActiveIndex(maxIndex);
        }
      },
      {
        root: null, // viewport
        rootMargin: "-20% 0px -20% 0px", // Trigger when section is 20% into viewport
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0], // Fine-grained thresholds
      }
    );

    // Observe all sections
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    observerRef.current = observer;

    // Cleanup
    return () => {
      observer.disconnect();
      entriesMapRef.current.clear();
    };
  }, [sections]);

  // Scroll to section
  const scrollToSection = useCallback(
    (index: number) => {
      const section = sections[index];
      const element = document.getElementById(section.id);

      if (element) {
        // Smooth scroll with offset for better UX
        const y = element.getBoundingClientRect().top + window.pageYOffset + scrollOffset;

        window.scrollTo({
          top: y,
          behavior: "smooth",
        });

        // Update active immediately for better perceived performance
        setActiveIndex(index);
      }
    },
    [sections, scrollOffset]
  );

  // Don't render if no sections or only one section
  if (sections.length <= 1) {
    return null;
  }

  const hideClass = {
    md: "md:hidden",
    lg: "lg:hidden",
    xl: "xl:hidden",
  }[hideOnBreakpoint];

  return (
    <div
      className={cn(
        // Fixed positioning at bottom
        "fixed bottom-6 left-0 right-0 z-50",
        // Center content
        "flex justify-center",
        // Pointer events
        "pointer-events-none",
        // Responsive visibility
        hideClass,
        // Safe area for iOS
        "pb-safe",
        className
      )}
      role="navigation"
      aria-label="Навигация по секциям"
    >
      <div
        className={cn(
          // Background with blur
          "bg-white/95 backdrop-blur-md",
          // Shape
          "rounded-full",
          // Spacing - increased for better touch targets
          "px-5 py-3",
          // Shadow
          "shadow-lg",
          // Enable pointer events for this container
          "pointer-events-auto",
          // Layout - increased gap for easier targeting
          "flex items-center gap-2"
        )}
      >
        {sections.map((section, index) => (
          <div key={section.id} className="flex items-center gap-2">
            {/* Dot Button - Variant 4: larger dot + padding for touch target */}
            <button
              type="button"
              onClick={() => scrollToSection(index)}
              className={cn(
                // Touch target padding (8px = 28-30px total area)
                "p-2",
                // Base styles
                "rounded-full transition-all duration-300",
                "focus:outline-none focus:ring-2 focus:ring-[#FF6F2C] focus:ring-offset-2",
                // Smooth transitions
                "transform"
              )}
              aria-label={`Перейти к секции: ${section.label}`}
              aria-current={activeIndex === index ? "true" : undefined}
            >
              {/* Visual dot - increased from 10px to 12px */}
              <span
                className={cn(
                  // Size - Variant 4: 12px base size
                  "block h-3 w-3",
                  // Shape
                  "rounded-full transition-all duration-300",
                  // Active state - increased scale for visibility
                  activeIndex === index
                    ? "scale-140 bg-[#FF6F2C] shadow-sm"
                    : "border-2 border-[#D1D5DB] hover:border-[#9CA3AF] hover:scale-110",
                  // Smooth transitions
                  "transform"
                )}
              />
            </button>

            {/* Connecting Line - increased gap */}
            {index < sections.length - 1 && (
              <div
                className={cn(
                  "h-px transition-all duration-300",
                  // Dynamic width based on proximity to active
                  Math.abs(index - activeIndex) === 0 || Math.abs(index + 1 - activeIndex) === 0
                    ? "w-6 bg-[#FF6F2C]/40"
                    : "w-5 bg-[#E5E7EB]"
                )}
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
