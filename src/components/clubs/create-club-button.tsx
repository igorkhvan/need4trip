"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useProtectedAction } from "@/lib/hooks/use-protected-action";

interface CreateClubButtonProps extends Omit<ButtonProps, 'onClick' | 'asChild'> {
  isAuthenticated: boolean;
  children?: React.ReactNode;
}

/**
 * Protected button for creating clubs
 * Opens auth modal if not authenticated, otherwise navigates to /clubs/create
 */
export function CreateClubButton({ 
  isAuthenticated, 
  children = "Создать клуб",
  className,
  ...buttonProps 
}: CreateClubButtonProps) {
  const { navigateTo } = useProtectedAction(isAuthenticated);

  return (
    <Button
      {...buttonProps}
      className={className}
      onClick={() => navigateTo('/clubs/create', {
        reason: "REQUIRED",
        title: "Создание клуба",
        description: "Для создания клуба необходимо войти через Telegram.",
      })}
    >
      {children}
    </Button>
  );
}

