"use client";

import { Button } from "@/components/ui/button";
import { useProtectedAction } from "@/lib/hooks/use-protected-action";

export function HeaderActions({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { navigateTo } = useProtectedAction(isAuthenticated);

  if (isAuthenticated) {
    return null; // Authenticated UI renders in MainHeader (server component)
  }

  return (
    <div className="flex items-center gap-3">
      <Button 
        onClick={() => navigateTo('/events/create', {
          reason: "REQUIRED",
          title: "Создание события",
          description: "Для создания события необходимо войти через Telegram.",
        })}
      >
        Создать событие
      </Button>
      <Button 
        variant="secondary"
        onClick={() => navigateTo('/', {
          reason: "REQUIRED",
        })}
      >
        Войти
      </Button>
    </div>
  );
}

