/**
 * Admin Layout Client
 * 
 * Pure layout component for Admin UI.
 * 
 * SECURITY (ADR-001, ADR-001.5):
 * - UI is NOT a security authority
 * - UI MUST NOT own secrets
 * - UI MUST NOT perform auth checks
 * - UI MUST NOT manage credentials
 * - Auth is handled entirely server-side
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0):
 * - Layout: STANDARD width (max-w-7xl)
 * - Navigation: isolated from user navigation
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §1
 * @see docs/adr/active/ADR-001.md
 * @see docs/adr/active/ADR-001.5.md
 */

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Users, Building2, ScrollText, Home, Shield, ShieldAlert } from "lucide-react";

interface AdminLayoutClientProps {
  children: ReactNode;
}

/**
 * Navigation items for Admin UI
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2
 */
const NAV_ITEMS = [
  { href: "/admin", label: "Главная", icon: Home, exact: true },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/clubs", label: "Клубы", icon: Building2 },
  { href: "/admin/audit", label: "Журнал действий", icon: ScrollText },
  { href: "/admin/abuse", label: "Abuse Monitor", icon: ShieldAlert },
];

/**
 * Admin Layout Client Component
 * 
 * This is a PURE LAYOUT component:
 * - Renders navigation and layout structure
 * - Renders children (page content)
 * - Does NOT perform auth checks
 * - Does NOT manage credentials
 * - Does NOT redirect based on auth state
 * 
 * Auth errors are handled by child page components via API responses.
 */
export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Admin Panel</span>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = item.exact 
                  ? pathname === item.href 
                  : pathname.startsWith(item.href);
                  
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            
            {/* Version indicator */}
            <span className="text-xs text-gray-400">V0</span>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <nav className="md:hidden border-t border-gray-100 px-4 py-2 flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);
              
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      
      {/* Main Content */}
      {/* SYSTEM CONTRACT: STANDARD width max-w-7xl */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {children}
      </main>
    </div>
  );
}
