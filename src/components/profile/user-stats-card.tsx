/**
 * User Stats Card Component
 * 
 * Карточка статистики пользователя
 */

"use client";

import { Calendar, Users, MapPin, TrendingUp } from "lucide-react";

interface UserStatsCardProps {
  stats: {
    eventsCreated?: number;
    eventsJoined?: number;
    clubsCount: number;
    totalDistance?: number;
  };
}

export function UserStatsCard({ stats }: UserStatsCardProps) {
  const statItems = [
    {
      label: "Клубов",
      value: stats.clubsCount,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Создано событий",
      value: stats.eventsCreated ?? 0,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Участие в событиях",
      value: stats.eventsJoined ?? 0,
      icon: MapPin,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Общий пробег, км",
      value: stats.totalDistance ?? 0,
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center mb-3`}>
            <item.icon className={`w-5 h-5 ${item.color}`} />
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {item.value}
          </div>
          <div className="text-sm text-gray-600">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

