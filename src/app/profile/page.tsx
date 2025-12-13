/**
 * User Profile Page - UserProfile.tsx дизайн из Figma
 * 
 * Полная страница профиля с header-плашкой, табами и управлением автомобилями
 */

"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { 
  User, Mail, Phone, MapPin, Calendar, Car, 
  Settings, Edit2, Camera, Save, X, Plus, Trash2, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CarData {
  id: number;
  brand: string;
  model: string;
  year: string;
  plate: string;
  color: string;
  type: string;
  isPrimary: boolean;
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    joined: '',
    avatar: ''
  });

  const [cars, setCars] = useState<CarData[]>([
    {
      id: 1,
      brand: 'Toyota',
      model: 'Land Cruiser 200',
      year: '2018',
      plate: 'A 123 BC 01',
      color: 'Белый',
      type: 'Внедорожник',
      isPrimary: true
    },
    {
      id: 2,
      brand: 'Nissan',
      model: 'Patrol',
      year: '2020',
      plate: 'B 456 CD 01',
      color: 'Черный',
      type: 'Внедорожник',
      isPrimary: false
    }
  ]);

  // Statistics
  const stats = {
    totalEvents: 24,
    completedEvents: 18,
    organizedEvents: 3
  };

  const handleSave = () => {
    setIsEditing(false);
    // TODO: Save to API
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSetPrimary = (id: number) => {
    setCars(cars.map(car => ({
      ...car,
      isPrimary: car.id === id
    })));
  };

  const handleDeleteCar = (id: number) => {
    const updatedCars = cars.filter(car => car.id !== id);
    if (updatedCars.length > 0 && !updatedCars.some(c => c.isPrimary)) {
      updatedCars[0].isPrimary = true;
    }
    setCars(updatedCars);
  };

  // TODO: Load user data from API
  useEffect(() => {
    // Mock data
    setUserData({
      name: 'Алексей Иванов',
      email: 'alexey.ivanov@email.com',
      phone: '+7 (701) 234-56-78',
      location: 'Алматы, Казахстан',
      bio: 'Любитель автомобильных приключений и бездорожья. Участник клуба OFF-ROAD с 2020 года.',
      joined: 'Январь 2020',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop'
    });
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="container-custom py-12">
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 md:py-12">
      <div className="container-custom">
        {/* Header with Cover Photo */}
        <div className="relative mb-6 md:mb-8">
          {/* Cover Image */}
          <div className="h-32 md:h-48 bg-gradient-to-r from-[var(--color-primary)] to-orange-600 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            
            {/* Top Right Actions */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {!isEditing ? (
                <>
                  <button className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors">
                    <Camera className="w-5 h-5 text-white" />
                  </button>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <Edit2 className="w-5 h-5 text-white" />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleSave}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors"
                  >
                    <Save className="w-5 h-5 text-[var(--color-primary)]" />
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </>
              )}
            </div>

            {/* User Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-white/30 bg-[var(--color-bg-subtle)] overflow-hidden shadow-lg backdrop-blur-sm">
                    <img 
                      src={userData.avatar} 
                      alt={userData.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {!isEditing && (
                    <button className="absolute bottom-0 right-0 p-1.5 bg-[var(--color-primary)] rounded-lg hover:bg-orange-600 transition-colors shadow-lg">
                      <Camera className="w-3.5 h-3.5 text-white" />
                    </button>
                  )}
                </div>

                {/* Name and Location */}
                <div className="flex-1 min-w-0">
                  <h1 className="mb-1 text-white drop-shadow-lg">{userData.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[13px] md:text-[14px] text-white/90">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span>{userData.location}</span>
                    </div>
                    <span className="hidden sm:inline">•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span>С {userData.joined}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-[24px] md:text-[32px] text-[var(--color-primary)] mb-1">{stats.totalEvents}</div>
              <div className="text-[12px] md:text-[13px] text-[var(--color-text-muted)]">Всего событий</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-[24px] md:text-[32px] text-[var(--color-success)] mb-1">{stats.completedEvents}</div>
              <div className="text-[12px] md:text-[13px] text-[var(--color-text-muted)]">Завершено</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-[24px] md:text-[32px] text-[var(--color-primary)] mb-1">{stats.organizedEvents}</div>
              <div className="text-[12px] md:text-[13px] text-[var(--color-text-muted)]">Организовано</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 md:gap-1 mb-6 md:mb-8 border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 md:px-5 py-3 text-[14px] md:text-[15px] border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Обзор
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 md:px-5 py-3 text-[14px] md:text-[15px] border-b-2 transition-colors ${
              activeTab === 'events'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            События
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 md:px-5 py-3 text-[14px] md:text-[15px] border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            Настройки
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Personal Info */}
            <Card>
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3>Личная информация</h3>
                  <User className="w-5 h-5 text-[var(--color-text-muted)]" />
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[13px] text-[var(--color-text-muted)] mb-1.5">
                        Имя и фамилия
                      </label>
                      <Input
                        value={userData.name}
                        onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] text-[var(--color-text-muted)] mb-1.5">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={userData.email}
                        onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] text-[var(--color-text-muted)] mb-1.5">
                        Телефон
                      </label>
                      <Input
                        value={userData.phone}
                        onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] text-[var(--color-text-muted)] mb-1.5">
                        О себе
                      </label>
                      <textarea
                        value={userData.bio}
                        onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-border)] 
                          focus:outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(255,111,44,0.1)]
                          transition-all duration-200 resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-[var(--color-bg-subtle)] rounded-xl">
                      <Mail className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[13px] text-[var(--color-text-muted)] mb-0.5">Email</div>
                        <div className="text-[15px]">{userData.email}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-[var(--color-bg-subtle)] rounded-xl">
                      <Phone className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[13px] text-[var(--color-text-muted)] mb-0.5">Телефон</div>
                        <div className="text-[15px]">{userData.phone}</div>
                      </div>
                    </div>
                    <div className="p-3 bg-[var(--color-bg-subtle)] rounded-xl">
                      <div className="text-[13px] text-[var(--color-text-muted)] mb-1">О себе</div>
                      <div className="text-[15px]">{userData.bio}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cars Section */}
            <Card>
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3>Мои автомобили</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[var(--color-text-muted)]">
                      {cars.length} {cars.length === 1 ? 'автомобиль' : 'автомобиля'}
                    </span>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить
                    </Button>
                  </div>
                </div>

                {/* Cars List */}
                {cars.length === 0 ? (
                  <div className="text-center py-8 text-[var(--color-text-muted)]">
                    <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>У вас пока нет добавленных автомобилей</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cars.map((car) => (
                      <div
                        key={car.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          car.isPrimary
                            ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary)]'
                            : 'bg-[var(--color-bg-subtle)] border-transparent hover:border-[var(--color-border)]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              car.isPrimary
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'bg-white text-[var(--color-text-muted)]'
                            }`}>
                              <Car className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-[16px]">{car.brand} {car.model}</h4>
                                {car.isPrimary && (
                                  <Badge variant="default">Основной</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--color-text-muted)]">
                                <span>{car.year} г.</span>
                                <span>•</span>
                                <span>{car.plate}</span>
                                {car.color && (
                                  <>
                                    <span>•</span>
                                    <span>{car.color}</span>
                                  </>
                                )}
                                <span>•</span>
                                <span>{car.type}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!car.isPrimary && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetPrimary(car.id)}
                              >
                                <Check className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Сделать основным</span>
                              </Button>
                            )}
                            <button
                              onClick={() => handleDeleteCar(car.id)}
                              className="p-2 hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'events' && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-[var(--color-text-muted)]">История событий появится здесь</p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-[var(--color-text-muted)]">Настройки появятся здесь</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
