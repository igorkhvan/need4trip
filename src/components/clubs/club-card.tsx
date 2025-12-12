/**
 * Club Card Component
 * 
 * Карточка клуба для отображения в списках
 */

"use client";

import Link from "next/link";
import { Users, Calendar, MapPin } from "lucide-react";
import type { Club, ClubPlan } from "@/lib/types/club";
import { Badge } from "@/components/ui/badge";
import { getClubPlanLabel } from "@/lib/types/club";

interface ClubCardProps {
  club: Club & {
    memberCount?: number;
    eventCount?: number;
    plan?: ClubPlan;
  };
}

export function ClubCard({ club }: ClubCardProps) {
  return (
    <Link
      href={`/clubs/${club.id}`}
      className="block group bg-white rounded-lg border border-gray-200 hover:border-primary-500 hover:shadow-md transition-all duration-200"
    >
      <div className="p-6">
        {/* Логотип и название */}
        <div className="flex items-start gap-4 mb-4">
          {club.logoUrl ? (
            <img
              src={club.logoUrl}
              alt={club.name}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {club.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-1 truncate">
              {club.name}
            </h3>
            {club.city && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                <span>
                  {club.city.name}
                  {club.city.region && `, ${club.city.region}`}
                </span>
              </div>
            )}
          </div>

          {/* План подписки */}
          {club.plan && club.plan !== "club_free" && (
            <Badge variant="premium" size="sm">
              {getClubPlanLabel(club.plan)}
            </Badge>
          )}
        </div>

        {/* Описание */}
        {club.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {club.description}
          </p>
        )}

        {/* Статистика */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {typeof club.memberCount === "number" && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>
                {club.memberCount} {club.memberCount === 1 ? "участник" : "участников"}
              </span>
            </div>
          )}
          {typeof club.eventCount === "number" && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {club.eventCount} {club.eventCount === 1 ? "событие" : "событий"}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

