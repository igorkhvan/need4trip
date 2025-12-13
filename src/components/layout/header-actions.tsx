"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";

export function HeaderActions({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { openModal } = useAuthModalContext();

  if (isAuthenticated) {
    return null; // Authenticated UI renders in MainHeader (server component)
  }

  return (
    <div className="flex items-center gap-3">
      <Button asChild>
        <Link href="/events/create">Создать событие</Link>
      </Button>
      <Button 
        variant="secondary"
        onClick={() => openModal({ reason: "REQUIRED" })}
      >
        Войти
      </Button>
    </div>
  );
}

