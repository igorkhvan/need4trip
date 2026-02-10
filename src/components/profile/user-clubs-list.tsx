/**
 * User Clubs List Component
 * 
 * Список клубов пользователя
 */

"use client";

import Link from "next/link";
import { Crown, Shield, Users, Plus } from "lucide-react";
import type { ClubWithMembership } from "@/lib/types/club";
import { getClubRoleLabel } from "@/lib/types/club";
import { Badge } from "@/components/ui/badge";
import { CreateClubButton } from "@/components/clubs/create-club-button";

interface UserClubsListProps {
  clubs: ClubWithMembership[];
  isAuthenticated?: boolean;
}

export function UserClubsList({ clubs, isAuthenticated = true }: UserClubsListProps) {
  const getRoleIcon = (role: ClubWithMembership["userRole"]) => {
    switch (role) {
      case "owner":
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case "admin":
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  if (clubs.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Вы пока не состоите в клубах
        </h3>
        <p className="text-gray-600 mb-6">
          Создайте свой клуб или присоединитесь к существующему
        </p>
        <CreateClubButton
          isAuthenticated={isAuthenticated}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Создать клуб
        </CreateClubButton>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {clubs.map((club) => (
        <Link
          key={club.id}
          href={`/clubs/${club.slug}`}
          className="block bg-white rounded-lg border border-gray-200 hover:border-primary-500 hover:shadow-md transition-all duration-200 p-4"
        >
          <div className="flex items-start gap-3">
            {/* Логотип */}
            {club.logoUrl ? (
              <img
                src={club.logoUrl}
                alt={club.name}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                {club.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Информация */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate mb-1">
                {club.name}
              </h3>
              
              {/* Роль */}
              <div className="flex items-center gap-2 mb-2">
                {getRoleIcon(club.userRole)}
                <span className="text-sm text-gray-600">
                  {getClubRoleLabel(club.userRole)}
                </span>
              </div>

              {/* Статистика */}
              <div className="text-sm text-gray-500">
                {club.memberCount} участников
              </div>
            </div>

            {/* Бейдж подписки */}
            {club.subscription?.planId && (
              <Badge variant="premium" size="sm">
                {club.subscription.planId === "club_50" ? "Club 50" : 
                 club.subscription.planId === "club_500" ? "Club 500" : 
                 "Unlimited"}
              </Badge>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

