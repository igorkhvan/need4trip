/**
 * User Profile Page - Client Component
 * 
 * Полная страница профиля с header-плашкой, табами и управлением автомобилями
 * Использует useLoadingTransition для плавных переходов между табами
 * 
 * Note: Auth is guaranteed by parent server component (app/profile/page.tsx)
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  User, Mail, Phone, MapPin, Calendar, Car, 
  Settings, Edit2, X, Plus, Trash2, Check, Pencil, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLoadingTransition } from "@/hooks/use-loading-transition";
import { useSimpleOptimistic } from "@/hooks/use-optimistic-state";
import { useLogout } from "@/lib/hooks/use-logout";
import { DelayedSpinner } from "@/components/ui/delayed-spinner";
import { ProfileContentSkeleton } from "@/components/ui/skeletons";
import { NotificationSettingsForm } from "@/components/profile/notification-settings-form";
import { FormField } from "@/components/ui/form-field";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandSelect, BrandSelectOption } from "@/components/brand-select";
import { CitySelect } from "@/components/ui/city-select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UserCar, CarType } from "@/lib/types/userCar";
import { formatJoinedDate } from "@/lib/utils/dates";
import { parseApiResponse, ClientError } from "@/lib/types/errors";
import { log } from "@/lib/utils/logger";

interface CarBrand {
  id: string;
  name: string;
  slug: string | null;
}

interface UserData {
  name: string;
  email: string;
  phone: string;
  location: string;
  cityId: string | null;
  bio: string;
  joined: string;
  avatar: string;
}

interface Stats {
  totalEvents: number;
  completedEvents: number;
  organizedEvents: number;
}

export function ProfilePageClient() {
  const router = useRouter();
  const { isPending, showLoading, startTransition } = useLoadingTransition(300);
  
  // Centralized logout hook with useTransition
  const logout = useLogout({ useTransition: true });
  
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'settings'>('overview');
  const [initialLoad, setInitialLoad] = useState(true);
  const [userData, setUserData] = useState<UserData>({
    name: '',
    email: '',
    phone: '',
    location: '',
    cityId: null,
    bio: '',
    joined: '',
    avatar: ''
  });

  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    completedEvents: 0,
    organizedEvents: 0
  });

  const [cars, setCars] = useState<UserCar[]>([]);
  // Optimistic state for cars
  const { optimisticState: optimisticCars, setOptimistic: setOptimisticCars } = 
    useSimpleOptimistic<UserCar[]>(cars);
  
  // Sync optimistic state with actual state
  useEffect(() => {
    setOptimisticCars(cars);
  }, [cars, setOptimisticCars]);
  const [brands, setBrands] = useState<BrandSelectOption[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [showAddCar, setShowAddCar] = useState(false);
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [newCar, setNewCar] = useState({
    carBrandId: '',
    type: '' as CarType | '',
    plate: '',
    color: ''
  });
  const [savingCar, setSavingCar] = useState(false);
  const [carFieldErrors, setCarFieldErrors] = useState<Record<string, string>>({});
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ 
    open: false, 
    message: '' 
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; carId: string | null }>({
    open: false,
    carId: null
  });

  // Load data
  useEffect(() => {
    loadProfileData();
    loadCars();
    loadBrands();
  }, []);

  const loadProfileData = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await parseApiResponse<{ user: any; stats: any }>(res);
      
      // Map user data
      const user = data.user;
      const cityName = user.city ? `${user.city.name}, ${user.city.region}` : '';
      
      // Format joined date
      const joinedDate = user.createdAt ? formatJoinedDate(user.createdAt) : '';
      
      setUserData({
        name: user.name || 'Пользователь',
        email: user.email || '',
        phone: user.phone || '',
        location: cityName || '',
        cityId: user.cityId || null,
        bio: user.bio || '',
        joined: joinedDate,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=FF6F2C&color=fff&size=200`
      });

      // Set stats from API
      setStats({
        totalEvents: data.stats?.totalEvents || 0,
        completedEvents: data.stats?.completedEvents || 0,
        organizedEvents: data.stats?.organizedEvents || 0
      });

      setInitialLoad(false);
    } catch (error) {
      if (error instanceof ClientError) {
        log.error('[loadProfileData] Failed to load profile', { 
          code: error.code, 
          statusCode: error.statusCode 
        });
        // TODO: Show error to user via toast/alert
      }
      setInitialLoad(false);
    }
  };

  const loadCars = async () => {
    try {
      const res = await fetch('/api/profile/cars');
      const data = await parseApiResponse<{ cars: UserCar[] }>(res);
      setCars(data.cars || []);
    } catch (error) {
      if (error instanceof ClientError) {
        log.error('[loadCars] Failed to load cars', { code: error.code });
      }
    }
  };

  const loadBrands = async () => {
    try {
      const [brandsRes, typesRes] = await Promise.all([
        fetch('/api/car-brands'),
        fetch('/api/vehicle-types'),
      ]);
      
      const brandsData = await parseApiResponse<{ brands: CarBrand[] }>(brandsRes);
      setBrands(brandsData.brands.map((brand: CarBrand) => ({
        id: brand.id,
        name: brand.name
      })));
      
      const typesData = await parseApiResponse<{ vehicleTypes: Array<{ value: string; label: string }> }>(typesRes);
      setVehicleTypes(typesData.vehicleTypes || []);
    } catch (error) {
      if (error instanceof ClientError) {
        log.error('[loadBrands] Failed to load brands/types', { code: error.code });
      }
    }
  };

  const handleSave = async () => {
    // Validate fields
    const errors: Record<string, string> = {};
    
    if (!userData.name.trim()) {
      errors.name = 'Имя и фамилия обязательны';
    }
    
    // Email validation (optional but must be valid format if provided)
    if (userData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email.trim())) {
        errors.email = 'Введите корректный email адрес';
      }
    }
    
    // Phone validation (only + and digits)
    if (userData.phone.trim()) {
      const phoneRegex = /^[\d+]+$/;
      if (!phoneRegex.test(userData.phone.trim())) {
        errors.phone = 'Телефон может содержать только цифры и символ +';
      }
    }
    
    // If validation fails, show errors and return
    if (Object.keys(errors).length > 0) {
      setProfileFieldErrors(errors);
      return;
    }

    setProfileFieldErrors({});

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email || null,
          bio: userData.bio,
          phone: userData.phone,
          cityId: userData.cityId,
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save profile');
      }

      const data = await res.json();
      
      // Update local state with saved data
      const user = data.user;
      const cityName = user.city ? `${user.city.name}, ${user.city.region}` : '';
      
      setUserData({
        ...userData,
        name: user.name || userData.name,
        bio: user.bio || '',
        phone: user.phone || '',
        location: cityName || userData.location,
        cityId: user.cityId || null,
      });

      setIsEditing(false);
    } catch (error) {
      setErrorDialog({ 
        open: true, 
        message: 'Не удалось сохранить профиль' 
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setProfileFieldErrors({});
    // Reload profile data to reset changes
    loadProfileData();
  };

  const handleAddCar = async () => {
    // Validate fields
    const errors: Record<string, string> = {};
    
    if (!newCar.carBrandId) {
      errors.carBrandId = 'Выберите марку автомобиля';
    }
    
    if (!newCar.type) {
      errors.type = 'Выберите тип автомобиля';
    }
    
    // If validation fails, show errors and return
    if (Object.keys(errors).length > 0) {
      setCarFieldErrors(errors);
      return;
    }

    setSavingCar(true);
    setCarFieldErrors({});
    
    // Prepare payload
    const payload = {
      carBrandId: newCar.carBrandId,
      type: newCar.type,
      plate: newCar.plate.trim() || null,
      color: newCar.color.trim() || null,
    };
    
    // Find brand name for optimistic UI
    const selectedBrand = brands.find(b => b.id === newCar.carBrandId);
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic update: add car immediately
    const now = new Date().toISOString();
    const optimisticCar: UserCar = {
      id: tempId,
      userId: '', // Will be set by server
      carBrandId: newCar.carBrandId,
      carBrand: selectedBrand ? { id: newCar.carBrandId, name: selectedBrand.name, slug: null } : undefined,
      type: newCar.type as CarType,
      plate: newCar.plate.trim() || null,
      color: newCar.color.trim() || null,
      isPrimary: cars.length === 0, // First car is primary
      createdAt: now,
      updatedAt: now,
    };
    
    setOptimisticCars([...cars, optimisticCar]);
    
    try {
      const res = await fetch('/api/profile/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        
        // Rollback optimistic update
        setOptimisticCars(cars);
        
        // Extract error message
        let errorMessage = 'Не удалось добавить автомобиль';
        
        if (errorData.error && typeof errorData.error.message === 'string') {
          errorMessage = errorData.error.message;
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        } else if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      
      // Reload cars list from server to get correct data
      await loadCars();
      
      setNewCar({ carBrandId: '', type: '', plate: '', color: '' });
      setShowAddCar(false);
    } catch (error) {
      // Optimistic state already rolled back
      
      // Safe error message extraction
      let message = 'Не удалось добавить автомобиль';
      
      if (error instanceof Error && typeof error.message === 'string') {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      }
      
      // Show error dialog instead of alert
      setErrorDialog({ open: true, message });
    } finally {
      setSavingCar(false);
    }
  };

  const startEditCar = (car: UserCar) => {
    setEditingCarId(car.id);
    setNewCar({
      carBrandId: car.carBrandId,
      type: car.type,
      plate: car.plate || '',
      color: car.color || ''
    });
    setCarFieldErrors({});
    setShowAddCar(false);  // Hide add form if open
  };

  const cancelEditCar = () => {
    setEditingCarId(null);
    setNewCar({ carBrandId: '', type: '', plate: '', color: '' });
    setCarFieldErrors({});
  };

  const handleUpdateCar = async () => {
    if (!editingCarId) return;

    // Validate fields
    const errors: Record<string, string> = {};
    
    if (!newCar.carBrandId) {
      errors.carBrandId = 'Выберите марку автомобиля';
    }
    
    if (!newCar.type) {
      errors.type = 'Выберите тип автомобиля';
    }
    
    // If validation fails, show errors and return
    if (Object.keys(errors).length > 0) {
      setCarFieldErrors(errors);
      return;
    }

    setSavingCar(true);
    setCarFieldErrors({});
    
    try {
      // Prepare payload: convert empty strings to null for optional fields
      const payload = {
        carBrandId: newCar.carBrandId,
        type: newCar.type,
        plate: newCar.plate.trim() || null,
        color: newCar.color.trim() || null,
      };

      const res = await fetch(`/api/profile/cars?id=${editingCarId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        
        let errorMessage = 'Не удалось обновить автомобиль';
        
        if (errorData.error && typeof errorData.error.message === 'string') {
          errorMessage = errorData.error.message;
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        } else if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      
      // Reload cars list from server
      await loadCars();
      
      setEditingCarId(null);
      setNewCar({ carBrandId: '', type: '', plate: '', color: '' });
    } catch (error) {
      let message = 'Не удалось обновить автомобиль';
      
      if (error instanceof Error && typeof error.message === 'string') {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      }
      
      setErrorDialog({ open: true, message });
    } finally {
      setSavingCar(false);
    }
  };

  const handleSetPrimary = async (carId: string) => {
    try {
      const res = await fetch(`/api/profile/cars?id=${carId}`, {
        method: 'PATCH'
      });

      if (!res.ok) throw new Error('Failed to set primary');

      // Update local state
      setCars(cars.map(car => ({
        ...car,
        isPrimary: car.id === carId
      })));
    } catch (error) {
      setErrorDialog({ 
        open: true, 
        message: 'Не удалось изменить основной автомобиль' 
      });
    }
  };

  const confirmDeleteCar = async () => {
    if (!deleteConfirm.carId) return;
    
    const carIdToDelete = deleteConfirm.carId;
    
    // Optimistic update: remove car immediately
    const previousCars = [...cars];
    setOptimisticCars(cars.filter(car => car.id !== carIdToDelete));
    
    // Close confirm dialog immediately for better UX
    setDeleteConfirm({ open: false, carId: null });

    try {
      const res = await fetch(`/api/profile/cars?id=${carIdToDelete}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete car');

      // Reload cars from server to get correct state
      await loadCars();
    } catch (error) {
      // Rollback optimistic update
      setOptimisticCars(previousCars);
      
      setErrorDialog({ 
        open: true, 
        message: 'Не удалось удалить автомобиль' 
      });
    }
  };

  if (initialLoad) {
    return (
      <ProfileContentSkeleton />
    );
  }

  return (
    <>
      <div className="space-y-6 py-6 md:py-10">
      {/* Header with Cover Photo */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-32 md:h-48 bg-gradient-to-r from-[var(--color-primary)] to-orange-600 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            
            {/* Top Right Actions - Desktop only */}
            <div className="absolute top-4 right-4 hidden md:flex items-center gap-2">
              <button
                onClick={logout}
                disabled={isPending}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Выйти из системы"
              >
                <LogOut className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* User Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Avatar className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-white/30 shadow-lg">
                    <AvatarImage
                      src={userData.avatar}
                      alt={userData.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl md:text-3xl bg-gradient-to-br from-[#FF6F2C] to-[#E86223] text-white font-bold rounded-2xl">
                      {userData.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Name and Location */}
                <div className="flex-1 min-w-0">
                  <h1 className="heading-h1 mb-1 text-white drop-shadow-lg">{userData.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm md:text-base text-white/90">
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
      <div className="grid grid-cols-3 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-[var(--color-primary)] mb-1">{stats.totalEvents}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Всего событий</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-[var(--color-success)] mb-1">{stats.completedEvents}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Завершено</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-[var(--color-primary)] mb-1">{stats.organizedEvents}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Организовано</div>
            </CardContent>
          </Card>
        </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: "overview", label: "Обзор" },
          { id: "events", label: "События" },
          { id: "settings", label: "Настройки" },
        ]}
        activeTab={activeTab}
        onChange={(tabId) => {
          startTransition(() => {
            setActiveTab(tabId as 'overview' | 'events' | 'settings');
          });
        }}
      />

      {/* Delayed loading indicator for tab transitions */}
      <DelayedSpinner show={showLoading} />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Personal Info */}
            <Card>
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3>Личная информация</h3>
                  {!isEditing && (
                    <Button 
                      onClick={() => setIsEditing(true)}
                      variant="ghost-icon"
                      size="icon-sm"
                      className="md:w-auto md:px-4"
                    >
                      <Edit2 className="icon-sm" />
                      <span className="sr-only md:not-sr-only md:ml-2">Редактировать</span>
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <FormField
                      id="profile-name"
                      label="Имя и фамилия"
                      required
                      error={profileFieldErrors.name}
                    >
                      <Input
                        value={userData.name}
                        onChange={(e) => {
                          setUserData({ ...userData, name: e.target.value });
                          if (profileFieldErrors.name) {
                            setProfileFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.name;
                              return next;
                            });
                          }
                        }}
                        className={profileFieldErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                    </FormField>
                    
                    <FormField
                      id="profile-email"
                      label="Email"
                      error={profileFieldErrors.email}
                    >
                      <Input
                        type="email"
                        value={userData.email}
                        onChange={(e) => {
                          setUserData({ ...userData, email: e.target.value });
                          if (profileFieldErrors.email) {
                            setProfileFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.email;
                              return next;
                            });
                          }
                        }}
                        className={profileFieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                    </FormField>
                    
                    <FormField
                      id="profile-phone"
                      label="Телефон"
                      error={profileFieldErrors.phone}
                    >
                      <Input
                        value={userData.phone}
                        onChange={(e) => {
                          setUserData({ ...userData, phone: e.target.value });
                          if (profileFieldErrors.phone) {
                            setProfileFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.phone;
                              return next;
                            });
                          }
                        }}
                        className={profileFieldErrors.phone ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                    </FormField>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">
                        Город
                      </label>
                      <CitySelect
                        value={userData.cityId}
                        onChange={(cityId) => setUserData({ ...userData, cityId })}
                        placeholder="Выберите город..."
                        className="shadow-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1.5">
                        О себе
                      </label>
                      <textarea
                        value={userData.bio}
                        onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white text-base text-[var(--color-text)]
                          hover:border-[var(--color-border-hover)] focus:outline-none focus:border-[var(--color-primary)]
                          transition-colors resize-none placeholder:text-muted-foreground"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button 
                        variant="ghost"
                        onClick={handleCancel}
                      >
                        Отмена
                      </Button>
                      <Button 
                        onClick={handleSave}
                      >
                        Сохранить
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-2.5 sm:p-3 bg-[var(--color-bg-subtle)] rounded-xl">
                      <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-muted-foreground mb-0.5">Email</div>
                        <div className="text-base">{userData.email}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2.5 sm:p-3 bg-[var(--color-bg-subtle)] rounded-xl">
                      <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-muted-foreground mb-0.5">Телефон</div>
                        <div className="text-base">{userData.phone}</div>
                      </div>
                    </div>
                    {userData.location && (
                      <div className="flex items-start gap-3 p-2.5 sm:p-3 bg-[var(--color-bg-subtle)] rounded-xl">
                        <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm text-muted-foreground mb-0.5">Город</div>
                          <div className="text-base">{userData.location}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3 p-2.5 sm:p-3 bg-[var(--color-bg-subtle)] rounded-xl">
                      <User className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">О себе</div>
                        <div className="text-base">{userData.bio}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cars Section */}
            <Card>
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3>Мои автомобили</h3>
                  <Button 
                    onClick={() => {
                      setShowAddCar(!showAddCar);
                      setEditingCarId(null);  // Close edit mode if open
                      setNewCar({ carBrandId: '', type: '', plate: '', color: '' });
                      setCarFieldErrors({});
                    }}
                    variant={optimisticCars.length === 0 ? "default" : "ghost-icon"}
                    size={optimisticCars.length === 0 ? "default" : "icon-sm"}
                    className={optimisticCars.length === 0 ? "" : "md:w-auto md:px-4"}
                  >
                    <Plus className="icon-sm" />
                    <span className={optimisticCars.length === 0 ? "ml-2" : "sr-only md:not-sr-only md:ml-2"}>Добавить</span>
                  </Button>
                </div>

                {/* Add Car Form */}
                {showAddCar && (
                  <div className="mb-4 p-3 sm:p-4 bg-[var(--color-bg-subtle)] rounded-xl space-y-3 sm:space-y-4">
                    <FormField
                      id="car-brand"
                      label="Марка"
                      required
                      error={carFieldErrors.carBrandId}
                    >
                      <BrandSelect
                        options={brands}
                        value={newCar.carBrandId}
                        onChange={(value) => {
                          setNewCar({ ...newCar, carBrandId: value });
                          if (carFieldErrors.carBrandId) {
                            setCarFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.carBrandId;
                              return next;
                            });
                          }
                        }}
                        error={!!carFieldErrors.carBrandId}
                        placeholder="Выберите марку"
                      />
                    </FormField>

                    <FormField
                      id="car-type"
                      label="Тип"
                      required
                      error={carFieldErrors.type}
                    >
                      <Select
                        value={newCar.type}
                        onValueChange={(value) => {
                          setNewCar({ ...newCar, type: value as CarType });
                          if (carFieldErrors.type) {
                            setCarFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.type;
                              return next;
                            });
                          }
                        }}
                      >
                        <SelectTrigger className={carFieldErrors.type ? 'border-red-500 focus-visible:ring-red-500' : ''}>
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                        {/* SSOT: SSOT_UI_COPY §2.2 - Inline async: ❌ No text */}
                        {/* FIX: Replaced "Загрузка..." with visual indicator */}
                        <SelectContent>
                          {vehicleTypes.length === 0 ? (
                            <SelectItem value="" disabled>•••</SelectItem>
                          ) : (
                            vehicleTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--color-text)]">
                        Гос номер <span className="text-xs text-muted-foreground">(опционально)</span>
                      </label>
                      <Input
                        placeholder="A 123 BC 01"
                        value={newCar.plate}
                        onChange={(e) => setNewCar({ ...newCar, plate: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--color-text)]">
                        Цвет <span className="text-xs text-muted-foreground">(опционально)</span>
                      </label>
                      <Input
                        placeholder="Белый"
                        value={newCar.color}
                        onChange={(e) => setNewCar({ ...newCar, color: e.target.value })}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button 
                        variant="ghost"
                        onClick={() => {
                          setShowAddCar(false);
                          setNewCar({ carBrandId: '', type: '', plate: '', color: '' });
                          setCarFieldErrors({});
                        }}
                      >
                        Отмена
                      </Button>
                      <Button 
                        onClick={handleAddCar}
                        disabled={savingCar}
                      >
                        {savingCar ? 'Сохранение...' : 'Сохранить'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cars List */}
                {optimisticCars.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>У вас пока нет добавленных автомобилей</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {optimisticCars.map((car) => {
                      const isEditing = editingCarId === car.id;
                      
                      return isEditing ? (
                        // Edit form (same as add form)
                        <div key={car.id} className="p-3 sm:p-4 bg-[var(--color-bg-subtle)] rounded-xl space-y-3 sm:space-y-4 border-2 border-[var(--color-primary)]">
                          <FormField
                            id="edit-car-brand"
                            label="Марка"
                            required
                            error={carFieldErrors.carBrandId}
                          >
                            <BrandSelect
                              options={brands}
                              value={newCar.carBrandId}
                              onChange={(value) => {
                                setNewCar({ ...newCar, carBrandId: value });
                                if (carFieldErrors.carBrandId) {
                                  setCarFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.carBrandId;
                                    return next;
                                  });
                                }
                              }}
                              error={!!carFieldErrors.carBrandId}
                              placeholder="Выберите марку"
                            />
                          </FormField>

                          <FormField
                            id="edit-car-type"
                            label="Тип"
                            required
                            error={carFieldErrors.type}
                          >
                            <Select
                              value={newCar.type}
                              onValueChange={(value) => {
                                setNewCar({ ...newCar, type: value as CarType });
                                if (carFieldErrors.type) {
                                  setCarFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.type;
                                    return next;
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className={carFieldErrors.type ? 'border-red-500 focus-visible:ring-red-500' : ''}>
                                <SelectValue placeholder="Выберите тип" />
                              </SelectTrigger>
                              {/* SSOT: SSOT_UI_COPY §2.2 - Inline async: ❌ No text */}
                              {/* FIX: Replaced "Загрузка..." with visual indicator */}
                              <SelectContent>
                                {vehicleTypes.length === 0 ? (
                                  <SelectItem value="" disabled>•••</SelectItem>
                                ) : (
                                  vehicleTypes.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </FormField>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--color-text)]">
                              Гос номер <span className="text-xs text-muted-foreground">(опционально)</span>
                            </label>
                            <Input
                              placeholder="A 123 BC 01"
                              value={newCar.plate}
                              onChange={(e) => setNewCar({ ...newCar, plate: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--color-text)]">
                              Цвет <span className="text-xs text-muted-foreground">(опционально)</span>
                            </label>
                            <Input
                              placeholder="Белый"
                              value={newCar.color}
                              onChange={(e) => setNewCar({ ...newCar, color: e.target.value })}
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <Button 
                              variant="ghost"
                              onClick={cancelEditCar}
                              disabled={savingCar}
                            >
                              Отмена
                            </Button>
                            <Button 
                              onClick={handleUpdateCar}
                              disabled={savingCar}
                            >
                              {savingCar ? 'Сохранение...' : 'Сохранить'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <div
                          key={car.id}
                          className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
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
                                  : 'bg-white text-muted-foreground'
                              }`}>
                                <Car className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-base font-semibold">
                                    {car.carBrand?.name || 'Неизвестная марка'}
                                  </h4>
                                  {car.isPrimary && (
                                    <Badge variant="default">Основной</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                  <span>{vehicleTypes.find(t => t.value === car.type)?.label || car.type}</span>
                                  {car.plate && (
                                    <>
                                      <span>•</span>
                                      <span>{car.plate}</span>
                                    </>
                                  )}
                                  {car.color && (
                                    <>
                                      <span>•</span>
                                      <span>{car.color}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-auto">
                              {!car.isPrimary && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetPrimary(car.id)}
                                >
                                  <Check className="icon-sm sm:mr-2" />
                                  <span className="hidden sm:inline">Сделать основным</span>
                                </Button>
                              )}
                              <Button
                                variant="ghost-icon"
                                size="icon-sm"
                                onClick={() => startEditCar(car)}
                                title="Редактировать"
                              >
                                <Pencil className="icon-sm" />
                              </Button>
                              <Button
                                variant="ghost-icon"
                                size="icon-sm"
                                onClick={() => setDeleteConfirm({ open: true, carId: car.id })}
                                className="hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
                                title="Удалить"
                              >
                                <Trash2 className="icon-sm" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'events' && (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <p className="text-muted-foreground">История событий появится здесь</p>
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <NotificationSettingsForm />
        )}
      </div>

      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ошибка</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog({ open: false, message: '' })}>
              Закрыть
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, carId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить автомобиль?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Автомобиль будет удален из вашего профиля.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setDeleteConfirm({ open: false, carId: null })}
              className="bg-transparent hover:bg-gray-100 text-gray-900 border border-gray-300"
            >
              Отмена
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={confirmDeleteCar}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}