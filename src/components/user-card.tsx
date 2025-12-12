/**
 * UserCard Component
 * 
 * Universal user card component for displaying user information
 * Used in: club members list, event participants, profile
 */

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Car, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ============================================================================
// TYPES
// ============================================================================

export interface UserCardData {
  id: string;
  name: string;
  avatarUrl?: string | null;
  telegramHandle?: string | null;
  city?: {
    id: string;
    name: string;
    region?: string;
  } | null;
  carBrand?: {
    id: string;
    name: string;
  } | null;
  carModelText?: string | null;
  carYear?: number | null;
  role?: string; // For club members
  joinedAt?: string; // For club members / event participants
}

export interface UserCardProps {
  user: UserCardData;
  size?: "small" | "medium" | "large";
  showCity?: boolean;
  showCar?: boolean;
  showRole?: boolean;
  showJoinedDate?: boolean;
  clickable?: boolean;
  className?: string;
  actions?: React.ReactNode; // Custom actions (e.g., remove button)
}

// ============================================================================
// COMPONENT
// ============================================================================

export function UserCard({
  user,
  size = "medium",
  showCity = false,
  showCar = false,
  showRole = false,
  showJoinedDate = false,
  clickable = false,
  className,
  actions,
}: UserCardProps) {
  const avatarSize = {
    small: "h-10 w-10",
    medium: "h-12 w-12",
    large: "h-16 w-16",
  }[size];

  const textSize = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
  }[size];

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const CardContent = (
    <div
      className={cn(
        "flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200",
        "transition-colors",
        clickable && "hover:bg-gray-50 hover:border-gray-300 cursor-pointer",
        className
      )}
    >
      {/* Avatar */}
      <Avatar className={avatarSize}>
        <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
        <AvatarFallback className="bg-orange-100 text-[#FF6F2C] font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("font-semibold text-[#0F172A] truncate", textSize)}>
            {user.name}
          </p>
          {showRole && user.role && (
            <Badge variant={getRoleBadgeVariant(user.role)} className="shrink-0">
              {getRoleLabel(user.role)}
            </Badge>
          )}
        </div>

        {/* Telegram Handle */}
        {user.telegramHandle && (
          <p className="text-sm text-gray-500">
            @{user.telegramHandle}
          </p>
        )}

        {/* Secondary Info */}
        <div className="flex flex-wrap gap-3 mt-1">
          {/* City */}
          {showCity && user.city && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <MapPin className="h-3.5 w-3.5" />
              <span>{user.city.name}</span>
            </div>
          )}

          {/* Car */}
          {showCar && user.carBrand && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Car className="h-3.5 w-3.5" />
              <span>
                {user.carBrand.name}
                {user.carModelText && ` ${user.carModelText}`}
                {user.carYear && ` (${user.carYear})`}
              </span>
            </div>
          )}

          {/* Joined Date */}
          {showJoinedDate && user.joinedAt && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(user.joinedAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );

  if (clickable) {
    return (
      <Link href={`/users/${user.id}`} className="block">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}

// ============================================================================
// COMPACT VERSION (for lists)
// ============================================================================

export function UserCardCompact({
  user,
  showCity = false,
  showCar = false,
  showRole = false,
  className,
  actions,
}: Omit<UserCardProps, "size">) {
  return (
    <UserCard
      user={user}
      size="small"
      showCity={showCity}
      showCar={showCar}
      showRole={showRole}
      clickable={false}
      className={className}
      actions={actions}
    />
  );
}

// ============================================================================
// LIST VERSION (multiple cards)
// ============================================================================

interface UserCardListProps {
  users: UserCardData[];
  size?: UserCardProps["size"];
  showCity?: boolean;
  showCar?: boolean;
  showRole?: boolean;
  showJoinedDate?: boolean;
  clickable?: boolean;
  emptyMessage?: string;
  renderActions?: (user: UserCardData) => React.ReactNode;
}

export function UserCardList({
  users,
  size = "medium",
  showCity = false,
  showCar = false,
  showRole = false,
  showJoinedDate = false,
  clickable = false,
  emptyMessage = "Пользователей нет",
  renderActions,
}: UserCardListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          size={size}
          showCity={showCity}
          showCar={showCar}
          showRole={showRole}
          showJoinedDate={showJoinedDate}
          clickable={clickable}
          actions={renderActions?.(user)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    owner: "Владелец",
    organizer: "Организатор",
    member: "Участник",
    pending: "Ожидает",
  };
  return labels[role] || role;
}

function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
  switch (role) {
    case "owner":
      return "default";
    case "organizer":
      return "secondary";
    default:
      return "outline";
  }
}

