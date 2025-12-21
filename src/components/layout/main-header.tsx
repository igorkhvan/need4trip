import Link from "next/link";
import { Car, Menu } from "lucide-react";

import { HeaderUserSection } from "@/components/layout/header-user-section";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentUser } from "@/lib/auth/currentUser";

const navItems = [
  { href: "/events", label: "События" },
  { href: "/clubs", label: "Клубы" },
  { href: "/pricing", label: "Тарифы" },
];

export async function MainHeader() {
  const currentUser = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md">
      <div className="page-container">
        <div className="flex h-16 items-center justify-between md:h-20">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] shadow-sm transition-shadow group-hover:shadow-md md:h-12 md:w-12">
              <Car className="h-5 w-5 text-white md:h-6 md:w-6" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-semibold text-[var(--color-text)] md:text-xl">Need4Trip</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Mobile Navigation */}
            <MobileNav navItems={navItems} currentUser={currentUser} />
            
            {/* User Section - Desktop only */}
            <div className="hidden md:flex">
              <HeaderUserSection currentUser={currentUser} />
            </div>
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
      className="rounded-lg px-4 py-2 font-medium text-[var(--color-text)] transition-all hover:bg-[var(--color-bg-subtle)]"
    >
      {children}
    </Link>
  );
}
