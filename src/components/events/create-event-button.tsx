"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useProtectedAction } from "@/lib/hooks/use-protected-action";

interface CreateEventButtonProps extends Omit<ButtonProps, 'onClick'> {
  isAuthenticated: boolean;
  children?: React.ReactNode;
}

/**
 * Protected button for creating events
 * Opens auth modal if not authenticated, otherwise navigates to /events/create
 */
export function CreateEventButton({ 
  isAuthenticated, 
  children = "Создать событие",
  ...buttonProps 
}: CreateEventButtonProps) {
  const { navigateTo } = useProtectedAction(isAuthenticated);

  return (
    <Button
      {...buttonProps}
      onClick={() => navigateTo('/events/create', {
        reason: "REQUIRED",
        title: "Создание события",
        description: "Для создания события необходимо войти через Telegram.",
      })}
    >
      {children}
    </Button>
  );
}

