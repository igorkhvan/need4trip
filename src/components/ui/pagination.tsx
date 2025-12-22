"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage <= 3) {
        // Near start: 1, 2, 3, ..., last
        pages.push(2, 3);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near end: 1, ..., last-2, last-1, last
        pages.push("...");
        pages.push(totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Middle: 1, ..., current, ..., last
        pages.push("...");
        pages.push(currentPage);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-muted-foreground transition-colors",
          currentPage === 1
            ? "cursor-not-allowed opacity-40"
            : "hover:border-[#D1D5DB] hover:bg-[var(--color-bg-subtle)]"
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Page numbers */}
      {pageNumbers.map((page, index) => {
        if (page === "...") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="flex h-11 w-11 items-center justify-center text-base text-muted-foreground"
            >
              ...
            </span>
          );
        }

        const isActive = page === currentPage;

        return (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl text-base font-medium transition-colors",
              isActive
                ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                : "border border-[var(--color-border)] bg-white text-muted-foreground hover:border-[#D1D5DB] hover:bg-[var(--color-bg-subtle)]"
            )}
          >
            {page}
          </button>
        );
      })}

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-muted-foreground transition-colors",
          currentPage === totalPages
            ? "cursor-not-allowed opacity-40"
            : "hover:border-[#D1D5DB] hover:bg-[var(--color-bg-subtle)]"
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

