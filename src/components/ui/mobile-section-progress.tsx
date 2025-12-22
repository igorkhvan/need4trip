/**
 * MobileSectionProgress Component
 * 
 * Thin progress line below header that fills as user scrolls through sections.
 * Auto-detects visible sections using Intersection Observer.
 * 
 * Features:
 * - Intersection Observer for active section tracking
 * - Smooth progress animation on scroll
 * - Fixed position below header
 * - Mobile only (hidden on desktop)
 * - No padding, no background - just a thin line
 * - Full width (edge-to-edge)
 * 
 * Usage:
 * ```tsx
 * const sections = [
 *   { id: "section-1", label: "First Section" },
 *   { id: "section-2", label: "Second Section" },
 * ];
 * 
 * <MobileSectionProgress sections={sections} />
 * ```
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

export interface Section {
  /** Unique ID matching the DOM element's id attribute */
  id: string;
  /** Human-readable label for accessibility */
  label: string;
}

interface MobileSectionProgressProps {
  /** Array of sections to track progress */
  sections: Section[];
  /** Optional CSS class name */
  className?: string;
}

export function MobileSectionProgress({
  sections,
  className,
}: MobileSectionProgressProps) {
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

  // Don't render if no sections or only one section
  if (sections.length <= 1) {
    return null;
  }

  // Calculate progress percentage (0% to 100%)
  const progress = (activeIndex / (sections.length - 1)) * 100;

  return (
    <div
      className={cn(
        // Fixed position below header (h-16 = 64px)
        "fixed top-16 left-0 right-0",
        // z-index below header (z-40) but above content
        "z-30",
        // Mobile only
        "lg:hidden",
        className
      )}
      role="progressbar"
      aria-label="Прогресс чтения секций"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Background track - full width, no padding */}
      <div className="h-0.5 bg-gray-200">
        {/* Progress fill - animated */}
        <div
          style={{ width: `${progress}%` }}
          className="h-0.5 bg-[#FF6F2C] transition-all duration-300 ease-out"
        />
      </div>
    </div>
  );
}

