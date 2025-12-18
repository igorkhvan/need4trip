/**
 * MobileSectionNav Component
 * 
 * Mobile-only floating navigation with dots and connecting lines.
 * Auto-detects visible sections using Intersection Observer.
 * Provides smooth scroll to sections on click.
 * 
 * Features:
 * - Intersection Observer for active section tracking
 *   - Maintains entry map for all observed sections
 *   - Re-evaluates ALL sections on any intersection change
 *   - Selects section with highest intersection ratio
 * - Smooth scroll behavior
 * - Accessibility (ARIA labels, keyboard navigation)
 * - iOS safe area support
 * - Performance optimized (debounced via thresholds)
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

export interface Section {
  id: string;
  label: string; // For accessibility
}

interface MobileSectionNavProps {
  sections: Section[];
  className?: string;
}

export function MobileSectionNav({ sections, className }: MobileSectionNavProps) {
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
  const scrollToSection = useCallback((index: number) => {
    const section = sections[index];
    const element = document.getElementById(section.id);
    
    if (element) {
      // Smooth scroll with offset for better UX
      const yOffset = -80; // Offset for potential header
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({
        top: y,
        behavior: "smooth",
      });

      // Update active immediately for better perceived performance
      setActiveIndex(index);
    }
  }, [sections]);

  // Don't render if no sections or only one section
  if (sections.length <= 1) {
    return null;
  }

  return (
    <div
      className={cn(
        // Fixed positioning at bottom
        "fixed bottom-6 left-0 right-0 z-50",
        // Center content
        "flex justify-center",
        // Pointer events
        "pointer-events-none",
        // Only on mobile
        "lg:hidden",
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
          // Spacing
          "px-4 py-2.5",
          // Shadow
          "shadow-lg",
          // Enable pointer events for this container
          "pointer-events-auto",
          // Layout
          "flex items-center gap-1.5"
        )}
      >
        {sections.map((section, index) => (
          <div key={section.id} className="flex items-center gap-1.5">
            {/* Dot Button */}
            <button
              onClick={() => scrollToSection(index)}
              className={cn(
                // Base styles
                "rounded-full transition-all duration-300",
                "focus:outline-none focus:ring-2 focus:ring-[#FF6F2C] focus:ring-offset-2",
                // Size
                "w-2.5 h-2.5",
                // Active state
                activeIndex === index
                  ? "bg-[#FF6F2C] scale-125 shadow-sm"
                  : "border-2 border-[#D1D5DB] hover:border-[#9CA3AF] hover:scale-110",
                // Smooth transitions
                "transform"
              )}
              aria-label={`Перейти к секции: ${section.label}`}
              aria-current={activeIndex === index ? "true" : undefined}
            />

            {/* Connecting Line */}
            {index < sections.length - 1 && (
              <div
                className={cn(
                  "h-px transition-all duration-300",
                  // Dynamic width based on proximity to active
                  Math.abs(index - activeIndex) === 0 || Math.abs(index + 1 - activeIndex) === 0
                    ? "w-6 bg-[#FF6F2C]/40"
                    : "w-4 bg-[#E5E7EB]"
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
