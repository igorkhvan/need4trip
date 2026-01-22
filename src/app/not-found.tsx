/**
 * 404 Not Found Page
 * 
 * SSOT: SSOT_UX_GOVERNANCE.md §2.2 — SYSTEM pages MUST use STANDARD width
 * SSOT: SSOT_UI_STATES.md §6.2 — NotFound MUST provide navigation escape
 * SSOT_EVENTS_UX_V1.1 §4 — Canonical SYSTEM layout with navigation escape
 * FIX: Unified structure with page-container, guaranteed navigation escape
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="page-container py-16 md:py-24">
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F9FAFB]">
          <Search className="h-10 w-10 text-muted-foreground" />
        </div>

        {/* 404 Text */}
        <h1 className="text-6xl font-bold text-[var(--color-text)] mb-4">
          404
        </h1>
        
        <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-3">
          Страница не найдена
        </h2>
        
        {/* SSOT: SSOT_UI_COPY.md — No elaborate explanations */}
        <p className="text-base text-muted-foreground mb-8 max-w-md">
          Эта страница не существует или была перемещена
        </p>

        {/* SSOT: SSOT_UI_STATES.md §6.2 — Navigation escape required */}
        {/* SSOT_EVENTS_UX_V1.1 §4 — Context-aware escape actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <BackButton 
            variant="outline" 
            size="lg" 
            fallbackHref="/"
            className="flex items-center gap-2"
          />
          
          <Button size="lg" asChild>
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              На главную
            </Link>
          </Button>
        </div>

        {/* Additional Links */}
        <div className="mt-12 pt-8 border-t border-[var(--color-border)] w-full max-w-md">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link href="/events" className="text-[var(--color-primary)] hover:underline font-medium">
              События
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/clubs" className="text-[var(--color-primary)] hover:underline font-medium">
              Клубы
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/pricing" className="text-[var(--color-primary)] hover:underline font-medium">
              Тарифы
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

