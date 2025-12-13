/**
 * User Profile Page
 * 
 * Страница профиля пользователя (по дизайну Figma)
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import Link from "next/link";
import { MapPin, Calendar, Edit2, Users, Car as CarIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/auth/logout-button";

export const dynamic = "force-dynamic";

async function getProfile() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/profile`, {
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

  // Format join date
  const joinDate = user.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : 'Недавно';

  return (
    <div className="bg-[#F9FAFB] py-6 md:py-12">
      <div className="page-container max-w-5xl">
        {/* User Header Card */}
        <Card className="mb-6 border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row">
            {/* Left: Avatar and Main Info */}
            <div className="flex flex-col items-center gap-4 md:items-start">
              {/* Avatar */}
              <div className="h-24 w-24 overflow-hidden rounded-2xl bg-[#F9FAFB]">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.name ?? "Пользователь"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FF6F2C] to-[#E86223] text-3xl font-bold text-white">
                    {(user.name ?? "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="text-center md:text-left">
                <h2 className="mb-1 text-[20px] font-semibold text-[#1F2937]">
                  {user.name ?? "Пользователь"}
                </h2>
                {user.telegramHandle && (
                  <a
                    href={`https://t.me/${user.telegramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 inline-block text-[14px] text-[#FF6F2C] hover:text-[#E55A1A]"
                  >
                    @{user.telegramHandle}
                  </a>
                )}
                
                {/* Meta Info */}
                <div className="mt-2 flex flex-col gap-1 text-[13px] text-[#6B7280]">
                  {profileUser.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>
                        {profileUser.city.name}
                        {profileUser.city.region && `, ${profileUser.city.region}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>С {joinDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Car Card or Edit Prompt */}
            <div className="flex-1">
              <div className="mb-3 flex items-start justify-between">
                <h4 className="text-[15px] font-semibold text-[#1F2937]">
                  Основной автомобиль
                </h4>
                <Link href="/profile/edit">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {profileUser.carModelText ? (
                <div className="relative h-48 overflow-hidden rounded-xl bg-[#F9FAFB]">
                  {/* Car placeholder image - можно заменить на реальное фото если есть */}
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E5E7EB] to-[#F9FAFB]">
                    <CarIcon className="h-16 w-16 text-[#9CA3AF]" />
                  </div>
                  
                  {/* Car Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="mb-1 flex items-center gap-2 text-white">
                      <CarIcon className="h-4 w-4" />
                      <span className="text-[15px] font-semibold">
                        {profileUser.carModelText}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-[#E5E7EB] bg-[#F9FAFB]">
                  <div className="text-center">
                    <CarIcon className="mx-auto mb-2 h-8 w-8 text-[#9CA3AF]" />
                    <p className="text-[13px] text-[#6B7280]">
                      Автомобиль не указан
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* My Clubs */}
        {clubs.length > 0 && (
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[20px] font-semibold text-[#1F2937]">
                Мои клубы
              </h3>
              <Link href="/clubs">
                <Button size="sm" variant="ghost">
                  Все клубы
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {clubs.slice(0, 3).map((club: any) => (
                <Link key={club.id} href={`/clubs/${club.id}`}>
                  <Card className="cursor-pointer border-[#E5E7EB] bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                    <div className="mb-3 flex items-start gap-3">
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-[#F9FAFB]">
                        {club.logoUrl ? (
                          <img 
                            src={club.logoUrl}
                            alt={club.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FF6F2C] to-[#E86223] text-sm font-bold text-white">
                            {club.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <h4 className="mb-1 truncate text-[15px] font-semibold text-[#1F2937]">
                          {club.name}
                        </h4>
                        <div className="flex items-center gap-1 text-[13px] text-[#6B7280]">
                          <Users className="h-3.5 w-3.5" />
                          <span>{club.memberCount || 0} участников</span>
                        </div>
                      </div>
                    </div>
                    
                    <Badge variant={club.role === 'owner' ? 'default' : 'secondary'}>
                      {club.role === 'owner' ? 'Владелец' : 
                       club.role === 'organizer' ? 'Организатор' : 'Участник'}
                    </Badge>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Logout Button */}
        <div className="flex justify-center pt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
