/**
 * Admin Dashboard
 * 
 * Entry point to Admin UI - navigation only.
 * 
 * SYSTEM CONTRACT (ADMIN_UI_CONTRACT v1.0 §2):
 * - Route: /admin
 * - READ: none (navigation only)
 * - WRITE: none
 * - Forbidden: metrics, charts, counts, actions
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md §2
 * @see SSOT_ADMIN_UI_PAGE_INVENTORY v1.0 §2.1
 */

import Link from "next/link";
import { Users, Building2, ScrollText, ArrowRight } from "lucide-react";

/**
 * Navigation cards - NO metrics, NO counts
 * @see ADMIN_UI_CONTRACT v1.0 §2 (/admin Forbidden: metrics, charts, counts)
 */
const SECTIONS = [
  {
    href: "/admin/users",
    title: "Пользователи",
    description: "Просмотр пользователей и биллинг-кредитов",
    icon: Users,
  },
  {
    href: "/admin/clubs",
    title: "Клубы",
    description: "Просмотр клубов и подписок",
    icon: Building2,
  },
  {
    href: "/admin/audit",
    title: "Журнал действий",
    description: "Просмотр admin-операций",
    icon: ScrollText,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 mt-1">
          Need4Trip Admin V0 — управление биллингом
        </p>
      </div>
      
      {/* Navigation Cards */}
      {/* ❌ NO metrics, NO charts, NO counts per SYSTEM CONTRACT */}
      <div className="grid gap-4 md:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group relative bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <section.icon className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-medium text-gray-900 group-hover:text-gray-700">
                  {section.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {section.description}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
      
      {/* Info Notice */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600">
          <strong>Admin V0</strong> — режим только для чтения и ограниченных операций 
          (выдача кредитов, продление подписок). Все действия записываются в журнал.
        </p>
      </div>
    </div>
  );
}
