/**
 * Profile Edit Page
 * 
 * Edit user profile (по дизайну Figma)
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Camera } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { MultiBrandSelect, MultiBrandSelectOption } from "@/components/multi-brand-select";
import type { City } from "@/lib/types/city";

interface ProfileEditForm {
  name: string;
  cityId: string | null;
  city: City | null;
  carBrandId: string | null;
  carModelText: string | null;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [brands, setBrands] = useState<MultiBrandSelectOption[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ProfileEditForm>({
    name: "",
    cityId: null,
    city: null,
    carBrandId: null,
    carModelText: "",
  });

  // Load car brands
  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch("/api/car-brands");
        if (!res.ok) throw new Error("Failed to load brands");
        const data = await res.json();
        setBrands(data.brands || []);
      } catch (err) {
        console.error("Failed to load brands:", err);
      }
    }
    loadBrands();
  }, []);

  // Load current profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          throw new Error("Failed to load profile");
        }
        const data = await res.json();
        const user = data.user;
        
        setFormData({
          name: user.name || "",
          cityId: user.cityId || null,
          city: user.city || null,
          carBrandId: user.carBrandId || null,
          carModelText: user.carModelText || "",
        });
        setAvatarUrl(user.avatarUrl || null);
      } catch (err) {
        console.error("Failed to load profile:", err);
        setError("Не удалось загрузить профиль");
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError(null);
    setFieldErrors({});
    
    // Validate
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = "Имя обязательно";
    }
    
    if (!formData.cityId) {
      errors.cityId = "Выберите город";
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    
    setSaving(true);
    
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          cityId: formData.cityId,
          carBrandId: formData.carBrandId,
          carModelText: formData.carModelText,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update profile");
      }
      
      router.push("/profile");
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setError(err.message || "Не удалось обновить профиль");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <Loader2 className="h-8 w-8 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  return (
    <div className="bg-[#F9FAFB] py-6 md:py-12">
      <div className="page-container max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/profile"
            className="mb-4 inline-flex items-center gap-2 text-[14px] text-[#6B7280] transition-colors hover:text-[#1F2937]"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к профилю
          </Link>
          <h1 className="mb-1 text-[28px] font-bold text-[#1F2937] md:text-[32px]">
            Редактировать профиль
          </h1>
          <p className="text-[14px] text-[#6B7280]">
            Обновите свою личную информацию и настройки
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] p-4 text-[14px] text-[#991B1B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Avatar Section */}
          <Card className="mb-4 border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
            <h3 className="mb-4 text-[18px] font-semibold text-[#1F2937]">
              Фото профиля
            </h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="h-24 w-24 overflow-hidden rounded-2xl bg-[#F9FAFB]">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FF6F2C] to-[#E86223] text-2xl font-bold text-white">
                      {formData.name ? formData.name.charAt(0).toUpperCase() : "U"}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 flex items-center justify-center rounded-lg bg-[#FF6F2C] p-2 shadow-lg transition-colors hover:bg-[#E55A1A]"
                  title="Изменить фото"
                >
                  <Camera className="h-4 w-4 text-white" />
                </button>
              </div>
              <div>
                <p className="mb-2 text-[14px] text-[#6B7280]">
                  Рекомендуемый размер: 400x400 пикселей
                </p>
                <Button type="button" variant="secondary" size="sm" disabled>
                  Загрузить фото
                </Button>
                <p className="mt-2 text-[12px] text-[#9CA3AF]">
                  Обновление через Telegram
                </p>
              </div>
            </div>
          </Card>

          {/* Personal Information */}
          <Card className="mb-4 border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
            <h3 className="mb-4 text-[18px] font-semibold text-[#1F2937]">
              Личная информация
            </h3>
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[13px] font-medium text-[#1F2937]">
                  Имя <span className="text-[#EF4444]">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Введите ваше имя"
                  className={fieldErrors.name ? "border-[#EF4444]" : ""}
                />
                {fieldErrors.name && (
                  <p className="text-[13px] text-[#EF4444]">{fieldErrors.name}</p>
                )}
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#1F2937]">
                  Город <span className="text-[#EF4444]">*</span>
                </Label>
                <CityAutocomplete
                  value={formData.cityId}
                  onChange={(cityId, city) => {
                    setFormData({ ...formData, cityId, city });
                    if (fieldErrors.cityId) {
                      setFieldErrors({ ...fieldErrors, cityId: "" });
                    }
                  }}
                  errorMessage={fieldErrors.cityId}
                />
              </div>
            </div>
          </Card>

          {/* Car Information */}
          <Card className="mb-6 border-[#E5E7EB] bg-white p-6 shadow-sm md:p-8">
            <h3 className="mb-4 text-[18px] font-semibold text-[#1F2937]">
              Информация об автомобиле
            </h3>
            <div className="space-y-4">
              {/* Car Brand */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[13px] font-medium text-[#1F2937]">
                    Марка
                  </label>
                  <span className="text-[12px] text-[#9CA3AF]">
                    Опционально
                  </span>
                </div>
                <MultiBrandSelect
                  label=""
                  placeholder="Выберите марку автомобиля"
                  options={brands}
                  value={formData.carBrandId ? [formData.carBrandId] : []}
                  onChange={(brandIds) => {
                    setFormData({ ...formData, carBrandId: brandIds[0] || null });
                  }}
                />
              </div>

              {/* Car Model */}
              {formData.carBrandId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="carModelText" className="text-[13px] font-medium text-[#1F2937]">
                      Модель
                    </Label>
                    <span className="text-[12px] text-[#9CA3AF]">
                      Опционально
                    </span>
                  </div>
                  <Input
                    id="carModelText"
                    value={formData.carModelText || ""}
                    onChange={(e) => setFormData({ ...formData, carModelText: e.target.value })}
                    placeholder="Например: Land Cruiser 200"
                  />
                  <p className="text-[13px] text-[#6B7280]">
                    Укажите модель и комплектацию
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              disabled={saving}
              size="lg"
              className="sm:flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Сохранить изменения
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/profile")}
              disabled={saving}
              size="lg"
              className="sm:flex-1"
            >
              Отмена
            </Button>
          </div>
        </form>

        {/* Help text */}
        <p className="mt-6 text-center text-[13px] text-[#6B7280]">
          Ваша информация видна только участникам ваших событий
        </p>
      </div>
    </div>
  );
}
