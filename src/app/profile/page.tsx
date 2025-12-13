/**
 * User Profile Page - Точное соответствие Figma дизайну
 * 
 * Страница профиля пользователя
 */

import { redirect } from "next/navigation";
import { MapPin, Calendar, Edit2, Users, Car as CarIcon } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/auth/logout-button";

export const dynamic = "force-dynamic";

async function getProfile() {
  try {
    // Используем абсолютный URL для серверного рендеринга
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/profile`, {
      cache: "no-store",
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("[getProfile] Failed", err);
    return null;
  }
}

export default async function ProfilePage() {
  const [user, profileData] = await Promise.all([
    getCurrentUser(),
    getProfile(),
  ]);

  if (!user) {
    redirect("/");
  }

  const clubs = profileData?.clubs ?? [];
  const profileUser = profileData?.user ?? user;

  return (
    <div className="py-6 md:py-12">
      <div className="container-custom max-w-5xl">
        {/* User Header Card - padding="lg" (20px) по Figma */}
        <Card className="mb-6">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Avatar and Main Info */}
              <div className="flex flex-col items-center md:items-start gap-4">
                {/* Avatar - 96x96px, rounded-2xl по Figma */}
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[var(--color-bg-subtle)]">
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.name ?? "Пользователь"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FF6F2C] to-[#E86223] text-white text-3xl font-bold">
                      {(user.name ?? "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                {/* User Info */}
                <div className="text-center md:text-left">
                  {/* h2 - используем глобальные стили по Figma */}
                  <h2 className="mb-1">{user.name ?? "Пользователь"}</h2>
                  
                  {/* Username - 14px по Figma */}
                  {user.telegramHandle && (
                    <p className="text-[14px] text-[var(--color-text-muted)] mb-2">
                      <a
                        href={`https://t.me/${user.telegramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[var(--color-primary)] transition-colors"
                      >
                        {user.telegramHandle}
                      </a>
                    </p>
                  )}
                  
                  {/* Meta Info - 13px по Figma */}
                  <div className="flex flex-col gap-1 text-[13px] text-[var(--color-text-muted)]">
                    {profileUser.city && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {profileUser.city.name}
                          {profileUser.city.region && `, ${profileUser.city.region}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        С {user.createdAt 
                          ? new Date(user.createdAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
                          : 'недавно'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Car Card */}
              {profileUser.carModelText && (
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    {/* h4 - 15px по Figma */}
                    <h4 className="text-[15px]">Основной автомобиль</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {}}
                    >
                      <Link href="/profile/edit">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                  
                  {/* Car Card - h-48, rounded-xl по Figma */}
                  <div className="relative rounded-xl overflow-hidden bg-[var(--color-bg-subtle)] h-48">
                    {/* Если есть фото - показываем, иначе bg-subtle */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FF6F2C]/20 to-[#E86223]/20" />
                    
                    {/* Car Info Overlay - точно по Figma */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="flex items-center gap-2 text-white mb-1">
                        <CarIcon className="w-4 h-4" />
                        <span className="font-semibold text-[15px]">
                          {profileUser.carModelText}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Clubs - точно по Figma */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            {/* h3 - используем глобальные стили по Figma */}
            <h3>Мои клубы</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {}}
            >
              <Link href="/clubs">Все клубы</Link>
            </Button>
          </div>
          
          {/* Grid - md:grid-cols-3 по Figma */}
          {clubs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {clubs.map((club: any) => (
                <Card
                  key={club.id}
                  className="cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md"
                  onClick={() => {}}
                >
                  <CardContent className="p-4">
                    <Link href={`/clubs/${club.id}`}>
                      {/* Club Info - точно по Figma */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--color-bg-subtle)] flex-shrink-0">
                          {club.logo ? (
                            <img 
                              src={club.logo}
                              alt={club.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FF6F2C] to-[#E86223] text-white text-sm font-bold">
                              {club.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* h4 - 15px по Figma */}
                          <h4 className="text-[15px] mb-1 truncate">{club.name}</h4>
                          <div className="flex items-center gap-1 text-[13px] text-[var(--color-text-muted)]">
                            <Users className="w-3.5 h-3.5" />
                            <span>{club.memberCount ?? 0} участников</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Badge - variant="primary" для Admin по Figma */}
                      <Badge variant={club.role === 'owner' ? 'default' : 'secondary'}>
                        {club.role === 'owner' ? 'Владелец' : club.role === 'organizer' ? 'Организатор' : 'Участник'}
                      </Badge>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-[var(--color-text-muted)] mb-4">Вы пока не состоите в клубах</p>
                <Button>
                  <Link href="/clubs/create">Создать клуб</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* My Events - отсутствует в текущей версии, но есть в Figma */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3>Мои события</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {}}
            >
              <Link href="/events">Все события</Link>
            </Button>
          </div>
          
          {/* Заглушка для будущей реализации */}
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-[var(--color-text-muted)] mb-4">Вы ещё не участвовали в событиях</p>
              <Button>
                <Link href="/events">Найти событие</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
