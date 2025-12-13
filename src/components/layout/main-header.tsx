import Link from "next/link";
import { Car } from "lucide-react";

import { HeaderUserSection } from "@/components/layout/header-user-section";
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
          <HeaderUserSection currentUser={currentUser} />
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
