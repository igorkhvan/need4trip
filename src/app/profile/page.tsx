/**
 * User Profile Page - UserProfile.tsx дизайн из Figma
 * 
 * Полная страница профиля с header-плашкой, табами и управлением автомобилями
 * Использует useLoadingTransition для плавных переходов между табами
 */

"use client";

import { useState, useEffect } from "react";
import { redirect, useRouter } from "next/navigation";
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
import { DelayedSpinner } from "@/components/ui/delayed-spinner";
import { ProfileContentSkeleton } from "@/components/ui/skeletons";
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

export default function ProfilePage() {
  const router = useRouter();
  const { isPending, showLoading, startTransition } = useLoadingTransition(300);
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
      
      if (!res.ok) {
        throw new Error('Failed to load profile');
      }

      const data = await res.json();
      
      // Map user data
      const user = data.user;
      const cityName = user.city ? `${user.city.name}, ${user.city.region}` : '';
      
      // Format joined date
      const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long'
      }) : '';
      
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
      console.error('[loadProfileData] Error:', error);
      setInitialLoad(false);
    }
  };

  const loadCars = async () => {
    try {
      const res = await fetch('/api/profile/cars');
      const data = await res.json();
      
      // API returns: { success: true, data: { cars: [...] } }
      if (data.success && data.data?.cars) {
        setCars(data.data.cars);
      }
    } catch (error) {
      console.error('[loadCars] Error:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const [brandsRes, typesRes] = await Promise.all([
        fetch('/api/car-brands'),
        fetch('/api/vehicle-types'),
      ]);
      
      if (brandsRes.ok) {
        const brandsData = await brandsRes.json();
        if (brandsData.brands) {
          setBrands(brandsData.brands.map((brand: CarBrand) => ({
            id: brand.id,
            name: brand.name
          })));
        }
      }
      
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        // API returns: {success: true, data: {vehicleTypes: [...]}}
        const types = typesData.data?.vehicleTypes || typesData.vehicleTypes || [];
        setVehicleTypes(types);
      }
    } catch (error) {
      console.error('[loadBrands] Error:', error);
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
      console.error('[handleSave] Error:', error);
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      
      // Dispatch auth change event
      window.dispatchEvent(new Event("auth-changed"));
      
      // Redirect to home
      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }
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
      console.log('[handleAddCar] Sending payload:', payload);

      const res = await fetch('/api/profile/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('[handleAddCar] Response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[handleAddCar] API Error:', errorData);
        
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
      console.log('[handleAddCar] Success:', data);
      
      // Reload cars list from server to get correct data
      await loadCars();
      
      setNewCar({ carBrandId: '', type: '', plate: '', color: '' });
      setShowAddCar(false);
    } catch (error) {
      console.error('[handleAddCar] Error:', error);
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

      console.log('[handleUpdateCar] Sending payload:', payload);

      const res = await fetch(`/api/profile/cars?id=${editingCarId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('[handleUpdateCar] Response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[handleUpdateCar] API Error:', errorData);
        
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
      console.log('[handleUpdateCar] Success:', data);
      
      // Reload cars list from server
      await loadCars();
      
      setEditingCarId(null);
      setNewCar({ carBrandId: '', type: '', plate: '', color: '' });
    } catch (error) {
      console.error('[handleUpdateCar] Error:', error);
      
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
      console.error('[handleSetPrimary] Error:', error);
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
      console.error('[confirmDeleteCar] Error:', error);
      
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
      <div className="container-custom py-12">
        <ProfileContentSkeleton />
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
              <button
                onClick={handleLogout}
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
                  <h1 className="text-2xl md:text-4xl font-bold mb-1 text-white drop-shadow-lg">{userData.name}</h1>
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
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-[var(--color-primary)] mb-1">{stats.totalEvents}</div>
              <div className="text-xs md:text-sm text-[var(--color-text-muted)]">Всего событий</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-[var(--color-success)] mb-1">{stats.completedEvents}</div>
              <div className="text-xs md:text-sm text-[var(--color-text-muted)]">Завершено</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl md:text-3xl font-bold text-[var(--color-primary)] mb-1">{stats.organizedEvents}</div>
              <div className="text-xs md:text-sm text-[var(--color-text-muted)]">Организовано</div>
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
          className="md:mb-8"
        />

        {/* Delayed loading indicator for tab transitions */}
        <DelayedSpinner show={showLoading} className="mb-6" />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Personal Info */}
            <Card>
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3>Личная информация</h3>
                  {!isEditing && (
                    <Button 
                      onClick={() => setIsEditing(true)}
                      variant="secondary"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Редактировать
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--color-text)]">
                        Имя и фамилия <span className="text-[var(--color-danger)]">*</span>
                      </label>
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
                      <div className="min-h-[20px] text-xs text-red-600">{profileFieldErrors.name ?? ''}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--color-text)]">
                        Email
                      </label>
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
                      <div className="min-h-[20px] text-xs text-red-600">{profileFieldErrors.email ?? ''}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--color-text)]">
                        Телефон
                      </label>
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
                      <div className="min-h-[20px] text-xs text-red-600">{profileFieldErrors.phone ?? ''}</div>
                    </div>
                    <div>
                      <label className="block text-sm text-[var(--color-text-muted)] mb-1.5">
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
                      <label className="block text-sm text-[var(--color-text-muted)] mb-1.5">
                        О себе
                      </label>
                      <textarea
                        value={userData.bio}
                        onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-white text-[15px] text-[#1F2937]
                          hover:border-[#D1D5DB] focus:outline-none focus:border-[var(--color-primary)]
                          transition-colors resize-none placeholder:text-[#6B7280]"
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
                    <div className="flex items-start gap-3 p-3 bg-[var(--color-bg-subtle)] rounded-xl">
                      <Mail className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-[var(--color-text-muted)] mb-0.5">Email</div>
                        <div className="text-base">{userData.email}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-[var(--color-bg-subtle)] rounded-xl">
                      <Phone className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-[var(--color-text-muted)] mb-0.5">Телефон</div>
                        <div className="text-base">{userData.phone}</div>
                      </div>
                    </div>
                    {userData.location && (
                      <div className="flex items-start gap-3 p-3 bg-[var(--color-bg-subtle)] rounded-xl">
                        <MapPin className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm text-[var(--color-text-muted)] mb-0.5">Город</div>
                          <div className="text-base">{userData.location}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3 p-3 bg-[var(--color-bg-subtle)] rounded-xl">
                      <User className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm text-[var(--color-text-muted)] mb-1">О себе</div>
                        <div className="text-base">{userData.bio}</div>
                      </div>
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
                  <Button 
                    onClick={() => {
                      setShowAddCar(!showAddCar);
                      setEditingCarId(null);  // Close edit mode if open
                      setNewCar({ carBrandId: '', type: '', plate: '', color: '' });
                      setCarFieldErrors({});
                    }}
                    variant={optimisticCars.length === 0 ? "default" : "secondary"}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить
                  </Button>
                </div>

                {/* Add Car Form */}
                {showAddCar && (
                  <div className="mb-4 p-4 bg-[var(--color-bg-subtle)] rounded-xl space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--color-text)]">
                        Марка <span className="text-[var(--color-danger)]">*</span>
                      </label>
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
                      <div className="min-h-[20px] text-xs text-red-600">{carFieldErrors.carBrandId ?? ''}</div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--color-text)]">
                        Тип <span className="text-[var(--color-danger)]">*</span>
                      </label>
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
                        <SelectContent>
                          {vehicleTypes.length === 0 ? (
                            <SelectItem value="" disabled>Загрузка...</SelectItem>
                          ) : (
                            vehicleTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <div className="min-h-[20px] text-xs text-red-600">{carFieldErrors.type ?? ''}</div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--color-text)]">
                        Гос номер <span className="text-xs text-[var(--color-text-muted)]">(опционально)</span>
                      </label>
                      <Input
                        placeholder="A 123 BC 01"
                        value={newCar.plate}
                        onChange={(e) => setNewCar({ ...newCar, plate: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[var(--color-text)]">
                        Цвет <span className="text-xs text-[var(--color-text-muted)]">(опционально)</span>
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
                  <div className="text-center py-8 text-[var(--color-text-muted)]">
                    <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>У вас пока нет добавленных автомобилей</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {optimisticCars.map((car) => {
                      const isEditing = editingCarId === car.id;
                      
                      return isEditing ? (
                        // Edit form (same as add form)
                        <div key={car.id} className="p-4 bg-[var(--color-bg-subtle)] rounded-xl space-y-4 border-2 border-[var(--color-primary)]">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--color-text)]">
                              Марка <span className="text-[var(--color-danger)]">*</span>
                            </label>
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
                            <div className="min-h-[20px] text-xs text-red-600">{carFieldErrors.carBrandId ?? ''}</div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--color-text)]">
                              Тип <span className="text-[var(--color-danger)]">*</span>
                            </label>
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
                              <SelectContent>
                                {vehicleTypes.length === 0 ? (
                                  <SelectItem value="" disabled>Загрузка...</SelectItem>
                                ) : (
                                  vehicleTypes.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <div className="min-h-[20px] text-xs text-red-600">{carFieldErrors.type ?? ''}</div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--color-text)]">
                              Гос номер <span className="text-xs text-[var(--color-text-muted)]">(опционально)</span>
                            </label>
                            <Input
                              placeholder="A 123 BC 01"
                              value={newCar.plate}
                              onChange={(e) => setNewCar({ ...newCar, plate: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-[var(--color-text)]">
                              Цвет <span className="text-xs text-[var(--color-text-muted)]">(опционально)</span>
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
                                  <h4 className="text-base font-semibold">
                                    {car.carBrand?.name || 'Неизвестная марка'}
                                  </h4>
                                  {car.isPrimary && (
                                    <Badge variant="default">Основной</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-text-muted)]">
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
                                  <Check className="w-4 h-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Сделать основным</span>
                                </Button>
                              )}
                              <button
                                onClick={() => startEditCar(car)}
                                className="h-8 w-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors"
                                title="Редактировать"
                              >
                                <Pencil className="w-4 h-4 text-gray-600" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ open: true, carId: car.id })}
                                className="h-8 w-8 flex items-center justify-center hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] rounded-lg transition-colors"
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
    </div>
  );
}