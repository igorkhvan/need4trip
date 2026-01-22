/**
 * Create Club Page Content
 * 
 * Клиентский компонент для создания клуба
 * 
 * SSOT: SSOT_UI_ASYNC_PATTERNS.md — CREATE pages render form immediately
 * Pattern: Static import for CREATE flow (no skeleton, instant render)
 */

"use client";

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useProtectedAction } from "@/lib/hooks/use-protected-action";

// SSOT_UI_STRUCTURE — CREATE page renders without skeleton
// Static import for CREATE flow: form renders instantly
import { ClubForm } from "@/components/clubs/club-form";

export function CreateClubPageContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { execute } = useProtectedAction(isAuthenticated);

  // Protect page access
  useEffect(() => {
    execute(
      () => {}, // Do nothing if authenticated (already on page)
      {
        reason: "REQUIRED",
        title: "Создание клуба",
        description: "Для создания клуба необходимо войти через Telegram.",
        redirectTo: '/clubs/create',
      }
    );
  }, [isAuthenticated, execute]);

  // Don't render form if not authenticated
  if (!isAuthenticated) {
    return null; // Modal will show, don't render anything
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      <div className="page-container space-y-6 pb-10 pt-12">
        {/* Кнопка назад */}
        <Link
          href="/clubs"
          className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Назад к списку клубов</span>
        </Link>

        {/* Заголовок */}
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)] md:text-4xl">Создать клуб</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Создайте клуб и соберите единомышленников для совместных путешествий
          </p>
        </div>

        {/* Форма */}
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <ClubForm mode="create" />
        </div>
      </div>
    </div>
  );
}
