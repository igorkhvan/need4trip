"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateEventButton } from "@/components/events/create-event-button";
import { useAuthModalContext } from "@/components/auth/auth-modal-provider";
import type { CurrentUser } from "@/lib/auth/currentUser";

export function HeaderUserSection({ currentUser }: { currentUser: CurrentUser | null }) {
  const isAuthenticated = !!currentUser;
  const { openModal } = useAuthModalContext();

  return (
    <div className="flex items-center gap-3">
      {currentUser ? (
        <>
          {/* User Profile Icon */}
          <Link 
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:bg-[#F9FAFB]"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage
                src={currentUser.avatarUrl ?? undefined}
                alt={currentUser.name ?? "Пользователь"}
              />
              <AvatarFallback className="text-xs">
                {currentUser.name?.slice(0, 2).toUpperCase() ??
                  currentUser.telegramHandle?.slice(0, 2).toUpperCase() ??
                  "TG"}
              </AvatarFallback>
            </Avatar>
          </Link>
          
          {/* Create Event Button */}
          <CreateEventButton 
            isAuthenticated={isAuthenticated}
          >
            Создать ивент
          </CreateEventButton>
        </>
      ) : (
        <>
          {/* User Icon (opens login modal) */}
          <button
            onClick={() => openModal({
              reason: "REQUIRED",
              title: "Войти в Need4Trip",
              description: "Чтобы продолжить, войдите через Telegram.",
            })}
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:bg-[#F9FAFB]"
          >
            <User className="h-5 w-5 text-[#111827]" />
          </button>
          
          {/* Create Event Button */}
          <CreateEventButton 
            isAuthenticated={isAuthenticated}
          >
            Создать ивент
          </CreateEventButton>
        </>
      )}
    </div>
  );
}

