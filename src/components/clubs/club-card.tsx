/**
 * Club Card Component
 * 
 * Карточка клуба для отображения в списках
 * Оптимизирована с Next.js Image для lazy loading
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import { Users, Calendar, MapPin } from "lucide-react";
import type { Club } from "@/lib/types/club";
import type { PlanId } from "@/lib/types/billing";
import { Badge } from "@/components/ui/badge";
import { getClubPlanLabel } from "@/lib/types/club";

interface ClubCardProps {
  club: Club & {
    memberCount?: number;
    eventCount?: number;
    planId?: PlanId | "free";
  };
}

export function ClubCard({ club }: ClubCardProps) {
  return (
    <Link
      href={`/clubs/${club.id}`}
      className="group block rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition-all duration-200 hover:border-[var(--color-primary)] hover:shadow-md lg:p-6"
    >
      {/* Логотип и название */}
      <div className="mb-4 flex items-start gap-4">
        {club.logoUrl ? (
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
            <Image
              src={club.logoUrl}
              alt={club.name}
              fill
              className="object-cover"
              sizes="64px"
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNFNUU3RUIiLz48L3N2Zz4="
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-hover)] text-2xl font-bold text-white">
            {club.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h4 className="mb-1 truncate text-[16px] font-semibold text-[#1F2937] transition-colors group-hover:text-[var(--color-primary)]">
            {club.name}
          </h4>
          {club.planId && club.planId !== "free" && (
            <Badge variant="default" size="sm" className="text-[12px]">
              {getClubPlanLabel(club.planId)}
            </Badge>
          )}
        </div>
      </div>

      {/* Описание */}
      {club.description && (
        <p className="mb-4 line-clamp-2 min-h-[40px] text-[14px] text-[#6B7280]">
          {club.description}
        </p>
      )}

      {/* Статистика */}
      <div className="mb-3 grid grid-cols-2 gap-3 rounded-xl bg-[#F9FAFB] p-3">
        <div>
          <div className="mb-1 text-[12px] text-[#6B7280]">Участников</div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-[var(--color-primary)]" />
            <span className="text-[15px] font-semibold text-[#1F2937]">
              {club.memberCount ?? 0}
            </span>
          </div>
        </div>
        <div>
          <div className="mb-1 text-[12px] text-[#6B7280]">Событий</div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
            <span className="text-[15px] font-semibold text-[#1F2937]">
              {club.eventCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Города */}
      {club.cities && club.cities.length > 0 && (
        <div className="text-[13px] text-[#6B7280]">
          📍{" "}
          {club.cities.length === 1
            ? club.cities[0].region
              ? `${club.cities[0].name}, ${club.cities[0].region}`
              : club.cities[0].name
            : `${club.cities.length} городов`}
        </div>
      )}
    </Link>
  );
}

