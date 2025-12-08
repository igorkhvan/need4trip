import Link from "next/link";

import { LoginButton } from "@/components/auth/login-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/currentUser";

const navItems = [
  { href: "/events", label: "События" },
  { href: "/events/create", label: "Создать событие" },
];

export async function MainHeader() {
  const currentUser = await getCurrentUser();

  return (
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Need4Trip
        </Link>
        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex items-center gap-2 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {currentUser ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border">
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
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">
                  {currentUser.name || currentUser.telegramHandle || "Пользователь"}
                </span>
                {currentUser.telegramHandle && (
                  <span className="text-xs text-muted-foreground">
                    @{currentUser.telegramHandle}
                  </span>
                )}
              </div>
              <LogoutButton />
            </div>
          ) : (
            <LoginButton isAuthenticated={Boolean(currentUser)} />
          )}
        </div>
      </div>
    </header>
  );
}
