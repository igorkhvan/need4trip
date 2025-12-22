/**
 * MobileSectionNav Component - Slider Version
 * 
 * Slider-based mobile navigation with continuous track and animated thumb.
 * Auto-detects visible sections using Intersection Observer.
 * 
 * Features:
 * - Intersection Observer for active section tracking
 * - Smooth slider animation on scroll
 * - Active mark highlighting
 * - Click/tap to scroll to section
 * - Adaptive width (scales to screen size)
 * - Touch-friendly targets (≥24px)
 * - Accessibility (ARIA labels, keyboard navigation)
 * - iOS safe area support
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

  // Calculate slider position (0% to 100%)
  const sliderPosition = (activeIndex / (sections.length - 1)) * 100;

  // Adaptive sizes based on number of sections
  const markSize = sections.length <= 5 ? "w-1 h-4" : "w-0.5 h-3";
  const thumbSize = sections.length <= 5 ? "w-7 h-7" : "w-6 h-6";

  return (
    <div
      className={cn(
        // Fixed positioning at bottom
        "fixed bottom-10 left-0 right-0 z-40 md:bottom-6",
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
      {/* Sizing container - adaptive width */}
      <div className="w-[calc(100vw-2rem)] max-w-sm pointer-events-auto">
        {/* Visual container */}
        <div
          className={cn(
            // Background with blur
            "bg-white/95 backdrop-blur-md",
            // Shape
            "rounded-full",
            // Spacing - adaptive
            "px-4 py-3 sm:px-5 sm:py-3.5",
            // Shadow
            "shadow-lg"
          )}
        >
          {/* Track container */}
          <div className="relative h-8 flex items-center">
            {/* Base track - continuous line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-gray-200 rounded-full" />

            {/* Progress fill - filled portion before slider */}
            <div
              style={{
                width: `${sliderPosition}%`,
              }}
              className="absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-[#FF6F2C]/30 rounded-full transition-all duration-300 ease-out"
            />

            {/* Marks - section indicators */}
            {sections.map((section, index) => {
              const isActive = index === activeIndex;
              const position = (index / (sections.length - 1)) * 100;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(index)}
                  style={{
                    left: `${position}%`,
                  }}
                  className={cn(
                    // Position
                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
                    // Touch target (≥24px)
                    "p-3",
                    // Focus state
                    "rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF6F2C] focus:ring-offset-2",
                    // z-index для кликабельности
                    "z-10"
                  )}
                  aria-label={`Перейти к секции: ${section.label}`}
                  aria-current={isActive ? "true" : undefined}
                >
                  {/* Visual mark */}
                  <span
                    className={cn(
                      // Base styles
                      "block rounded-full transition-all duration-300",
                      // Size and color based on state
                      isActive
                        ? cn("w-1.5 h-5 bg-[#FF6F2C]", markSize.includes("h-3") && "h-4") // Active: taller, primary color
                        : cn(markSize, "bg-gray-400 hover:bg-gray-500") // Inactive: smaller, gray
                    )}
                  />
                </button>
              );
            })}

            {/* Slider thumb - animated indicator */}
            <div
              style={{
                left: `${sliderPosition}%`,
              }}
              className={cn(
                // Position
                "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
                // Size
                thumbSize,
                // Appearance
                "bg-[#FF6F2C] rounded-full shadow-md",
                // Ring effect
                "ring-2 ring-white",
                // Animation
                "transition-all duration-300 ease-out",
                // z-index выше меток
                "z-20",
                // Pointer events off (метки обрабатывают клики)
                "pointer-events-none"
              )}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
