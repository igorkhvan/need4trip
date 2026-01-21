/**
 * Club Settings Page (Canonical)
 * 
 * Phase 3B: Introduction of canonical Club Settings route.
 * 
 * Per SSOT_CLUBS_DOMAIN.md §3.2: Club settings is owner-only.
 * Per CLUBS_IMPLEMENTATION_BLUEPRINT v1 §5.7: Administrative configuration.
 * 
 * Sections:
 * 1. General Settings (placeholder)
 * 2. Billing (placeholder — NOT implemented in Phase 3B)
 * 3. Danger Zone (placeholder)
 * 
 * States:
 * - Loading → Server Component (no client-side loading)
 * - Forbidden → Redirect to /clubs/[id]
 * - Archived → Banner + read-only notice
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, CreditCard, AlertTriangle, Archive } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getClubBasicInfo, getUserClubRole } from "@/lib/services/clubs";
import { ClubArchivedBanner } from "../_components/club-archived-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface ClubSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClubSettingsPage({ params }: ClubSettingsPageProps) {
  const { id } = await params;

  // Load critical data
  const [user, clubResult] = await Promise.all([
    getCurrentUser(),
    getClubBasicInfo(id).catch(() => null),
  ]);

  // 404: Club not found
  if (!clubResult) {
    notFound();
  }

  const club = clubResult;

  // Auth check: must be authenticated
  if (!user) {
    redirect(`/clubs/${id}`);
  }

  // Role check: owner-only per SSOT_CLUBS_DOMAIN.md §3.2
  const userRole = await getUserClubRole(id, user.id);
  const isOwner = userRole === "owner";

  if (!isOwner) {
    redirect(`/clubs/${id}`);
  }

  // Check archived state
  const isArchived = !!club.archivedAt;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link
          href={`/clubs/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад к клубу
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Настройки клуба</h1>
          <p className="text-gray-600 mt-2">
            Управление настройками клуба
          </p>
        </div>

        {/* Archived Banner - per SSOT_CLUBS_DOMAIN.md §8.3 */}
        {isArchived && (
          <div className="mb-6">
            <ClubArchivedBanner />
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  Клуб находится в архиве. Большинство настроек недоступны для изменения.
                  Вы можете только просматривать биллинг и отменить подписку.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: General Settings (Placeholder) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Основные настройки
            </CardTitle>
            <CardDescription>
              Настройки профиля и видимости клуба
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">
                Раздел в разработке
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Billing (Placeholder — NOT implemented in Phase 3B) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Биллинг
            </CardTitle>
            <CardDescription>
              Управление подпиской и тарифом клуба
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">
                Раздел в разработке
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Danger Zone (Placeholder) */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              Опасная зона
            </CardTitle>
            <CardDescription>
              Необратимые действия с клубом
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-gray-500">
              <Archive className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">
                Раздел в разработке
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
