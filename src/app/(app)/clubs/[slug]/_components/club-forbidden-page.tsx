/**
 * ClubForbiddenPage Component
 * 
 * Full page forbidden layout.
 * Per Visual Contract v6 §10: 403/404 → redirect or standard forbidden page.
 * Triggered by 403 from API-016.
 */

import Link from "next/link";
import { ShieldX, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClubForbiddenPageProps {
  message?: string;
}

export function ClubForbiddenPage({ message }: ClubForbiddenPageProps) {
  return (
    <div className="space-y-6 pb-10 pt-12">
      {/* Back button */}
      <Link
        href="/clubs"
        className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Все клубы</span>
      </Link>

      {/* Forbidden content */}
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FEF2F2]">
          <ShieldX className="h-10 w-10 text-[#DC2626]" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-[var(--color-text)]">
          Доступ ограничен
        </h1>
        <p className="mb-8 text-center text-muted-foreground max-w-md">
          {message || "У вас нет доступа к просмотру этого клуба. Возможно, это закрытый клуб."}
        </p>
        <Button asChild>
          <Link href="/clubs">
            Вернуться к списку клубов
          </Link>
        </Button>
      </div>
    </div>
  );
}
