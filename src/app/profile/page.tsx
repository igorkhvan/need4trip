/**
 * User Profile Page
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
  const stats = profileData?.stats ?? { clubsCount: 0 };
  const profileUser = profileData?.user ?? user;

  return (
    <div className="py-6 md:py-12">
      <div className="page-container max-w-5xl">
        {/* User Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Avatar and Main Info */}
              <div className="flex flex-col items-center md:items-start gap-4">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#F9FAFB]">
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
                  <h2 className="text-[28px] font-bold text-[#111827] mb-1">
                    {user.name ?? "Пользователь"}
                  </h2>
                  {user.telegramHandle && (
                    <a
                      href={`https://t.me/${user.telegramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[14px] text-[#6B7280] hover:text-[#FF6F2C] mb-2 inline-block"
                    >
                      @{user.telegramHandle}
                    </a>
                  )}
                  
                  {/* Meta Info */}
                  <div className="flex flex-col gap-1 text-[13px] text-[#6B7280] mt-2">
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
                    <h4 className="text-[15px] font-semibold text-[#111827]">Основной автомобиль</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                    >
                      <Link href="/profile/edit">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                  
                  <div className="relative rounded-xl overflow-hidden bg-[#F9FAFB] h-48">
                    {/* Placeholder gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FF6F2C]/20 to-[#E86223]/20" />
                    
                    {/* Car Info Overlay */}
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

        {/* My Clubs */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[20px] font-semibold text-[#111827]">Мои клубы</h3>
            <Button
              size="sm"
              variant="ghost"
              asChild
            >
              <Link href="/clubs">Все клубы</Link>
            </Button>
          </div>
          
          {clubs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {clubs.map((club: any) => (
                <Card
                  key={club.id}
                  className="cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <Link href={`/clubs/${club.id}`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#F9FAFB] flex-shrink-0">
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
                          <h4 className="text-[15px] font-semibold text-[#111827] mb-1 truncate">
                            {club.name}
                          </h4>
                          <div className="flex items-center gap-1 text-[13px] text-[#6B7280]">
                            <Users className="w-3.5 h-3.5" />
                            <span>{club.memberCount ?? 0} участников</span>
                          </div>
                        </div>
                      </div>
                      
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
                <p className="text-[#6B7280] mb-4">Вы пока не состоите в клубах</p>
                <Button asChild>
                  <Link href="/clubs/create">Создать клуб</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Logout Button */}
        <div className="flex justify-center pt-6">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
