import Link from "next/link";
import { Car, User } from "lucide-react";

import { LoginButton } from "@/components/auth/login-button";
import { LogoutButton } from "@/components/auth/logout-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/currentUser";

const navItems = [
  { href: "/events", label: "События" },
];

export async function MainHeader() {
  const currentUser = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/80 backdrop-blur-md">
      <div className="page-container">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6F2C] to-[#E86223] shadow-sm transition-shadow group-hover:shadow-md">
              <Car className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[22px] font-semibold text-[#111827]">Need4Trip</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <Link
                  href="/profile"
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:bg-[#F7F7F8]"
                  title="Профиль"
                >
                  <User className="h-5 w-5 text-[#111827]" />
                </Link>
                <Button asChild>
                  <Link href="/events/create">Создать событие</Link>
                </Button>
                <div className="hidden items-center gap-3 lg:flex">
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
                      <span className="text-xs text-[#6B7280]">@{currentUser.telegramHandle}</span>
                    )}
                  </div>
                  <LogoutButton />
                </div>
              </>
            ) : (
              <>
                <Button asChild>
                  <Link href="/events/create">Создать событие</Link>
                </Button>
                <LoginButton isAuthenticated={false} />
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-4 py-2 font-medium text-[#111827] transition-all hover:bg-[#F7F7F8]"
    >
      {children}
    </Link>
  );
}
