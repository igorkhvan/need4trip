"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/auth/logout-button";
import { CreateEventButton } from "@/components/events/create-event-button";
import type { CurrentUser } from "@/lib/auth/currentUser";

export function HeaderUserSection({ currentUser }: { currentUser: CurrentUser | null }) {
  const isAuthenticated = !!currentUser;

  return (
    <div className="flex items-center gap-3">
      <CreateEventButton 
        isAuthenticated={isAuthenticated}
      />
      
      {currentUser ? (
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/profile">
            <Avatar className="h-9 w-9 border cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage
                src={currentUser.avatarUrl ?? undefined}
                alt={currentUser.name ?? "Пользователь"}
              />
              <AvatarFallback>
                {currentUser.name?.slice(0, 2).toUpperCase() ??
                  currentUser.telegramHandle?.slice(0, 2).toUpperCase() ??
                  "TG"}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">
              {currentUser.name || currentUser.telegramHandle || "Пользователь"}
            </span>
            {currentUser.telegramHandle && (
              <span className="text-xs text-[#6B7280]">@{currentUser.telegramHandle}</span>
            )}
          </div>
          <LogoutButton />
        </div>
      ) : (
        <Button 
          variant="secondary"
          onClick={() => {
            // This will be handled by CreateEventButton opening modal
            // or we can add a separate login button click handler
          }}
        >
          Войти
        </Button>
      )}
    </div>
  );
}

