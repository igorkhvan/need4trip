import Link from "next/link";
import Image from "next/image";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { LoginButton } from "@/components/auth/login-button";
import { LogoutButton } from "@/components/auth/logout-button";

const navItems = [
  { href: "/events", label: "Ивенты" },
  { href: "/events/create", label: "Создать ивент" },
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
              {currentUser.avatarUrl ? (
                <Image
                  src={currentUser.avatarUrl}
                  alt={currentUser.name ?? "Пользователь"}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full border object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted text-xs font-semibold">
                  {currentUser.name?.slice(0, 2).toUpperCase() ?? "TG"}
                </div>
              )}
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold">
                  {currentUser.name || currentUser.telegramHandle || "Пользователь"}
                </span>
                {currentUser.telegramHandle && (
                  <span className="text-xs text-muted-foreground">@{currentUser.telegramHandle}</span>
                )}
              </div>
              <LogoutButton />
            </div>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </header>
  );
}
