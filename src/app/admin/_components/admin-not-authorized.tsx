/**
 * Admin Not Authorized Screen
 * 
 * Neutral screen shown to users without admin access.
 * 
 * DESIGN PRINCIPLES:
 * - Does NOT reveal admin UI structure (no navigation, no pages)
 * - Provides neutral, non-alarming message
 * - Offers path back to main site
 * - No technical details exposed
 * 
 * SECURITY (ADR-001, ADR-001.5):
 * - This is a UX component, NOT a security boundary
 * - UI MUST NOT own secrets or perform auth checks
 * - Authorization is enforced at API routes
 * 
 * @see docs/ui-contracts/system/ADMIN_UI_CONTRACT v1.0.md
 * @see SSOT_ARCHITECTURE.md §8.3 (Admin Context)
 */

import Link from "next/link";
import { Shield } from "lucide-react";

/**
 * Not Authorized Screen for Admin UI
 * 
 * Shown when:
 * - User is not authenticated
 * - User is authenticated but not in admin allowlist
 * - Network error during admin access check
 * 
 * This component:
 * - Does NOT show admin navigation
 * - Does NOT show admin pages
 * - Provides neutral message and return path
 */
export function AdminNotAuthorized() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4 p-8">
        {/* Icon */}
        <div className="text-gray-400">
          <Shield className="h-12 w-12 mx-auto" />
        </div>
        
        {/* Title */}
        <h1 className="text-xl font-semibold text-gray-900">
          Доступ запрещён
        </h1>
        
        {/* Message - neutral, non-alarming */}
        <p className="text-gray-500 max-w-sm mx-auto">
          У вас нет прав для доступа к панели администратора.
        </p>
        
        {/* Return link */}
        <Link 
          href="/" 
          className="inline-block mt-4 text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}
