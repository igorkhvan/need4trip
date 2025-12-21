/**
 * Profile Edit Page - Точное соответствие Figma дизайну
 * 
 * Edit user profile (name, city, car)
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Camera } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { FormField } from "@/components/ui/form-field";
import { MultiBrandSelect, MultiBrandSelectOption } from "@/components/multi-brand-select";
import { scrollToFirstError } from "@/lib/utils/form-validation";
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
        const response = await res.json();
        const data = response.data || response;
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
        const response = await res.json();
        const data = response.data || response;
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
    
    // Clear previous errors
    setError(null);
    setFieldErrors({});
    
    // Validate
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = "Имя обязательно";
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      
      // Scroll to first error field
      setTimeout(() => {
        scrollToFirstError({ offset: 100 });
      }, 100);
      
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
      
      // Redirect to profile page
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
      <div className="page-container py-12">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 md:py-12">
      <div className="page-container max-w-3xl">
        {/* Header - точно по Figma */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[14px]">Назад к профилю</span>
          </button>
          {/* h1 - используем глобальные стили по Figma */}
          <h1 className="mb-1">Редактировать профиль</h1>
          <p className="text-[var(--color-text-muted)] text-[14px]">
            Обновите свою личную информацию и настройки
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Avatar Section - padding="lg" по Figma */}
          <Card className="mb-6">
            <CardContent className="p-5 md:p-6">
              {/* h3 - используем глобальные стили по Figma */}
              <h3 className="mb-4">Фото профиля</h3>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {/* Avatar - 96x96px, rounded-2xl по Figma */}
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[var(--color-bg-subtle)]">
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FF6F2C] to-[#E86223] text-white text-3xl font-bold">
                        {(formData.name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Camera button - точно по Figma */}
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 p-2 bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div>
                  <p className="text-[14px] text-[var(--color-text-muted)] mb-2">
                    Рекомендуемый размер: 400x400 пикселей
                  </p>
                  <Button type="button" variant="secondary" size="sm">
                    Загрузить фото
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information - padding="md" по Figma */}
          <Card className="mb-4">
            <CardContent className="p-4">
              {/* h3 - используем глобальные стили по Figma */}
              <h3 className="mb-3">Личная информация</h3>
              <div className="space-y-3">
                {/* Name - точно по Figma */}
                <FormField
                  id="name"
                  label="Имя"
                  required
                  error={fieldErrors.name}
                >
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Введите имя"
                    required
                  />
                </FormField>

                {/* City - точно по Figma с "Опционально" */}
                <FormField
                  id="cityId"
                  label="Город"
                  hint="Опционально"
                  error={fieldErrors.cityId}
                >
                  <CityAutocomplete
                    value={formData.cityId}
                    onChange={(cityId, city) => {
                      setFormData({ ...formData, cityId, city });
                      if (fieldErrors.cityId) {
                        setFieldErrors({ ...fieldErrors, cityId: "" });
                      }
                    }}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Car Information - padding="md" по Figma */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="mb-3">Информация об автомобиле</h3>
              <div className="space-y-3">
                {/* Brand - точно по Figma */}
                <FormField
                  id="carBrandId"
                  label="Марка"
                  hint="Опционально"
                >
                  <Input
                    type="text"
                    value={formData.carBrandId || ""}
                    onChange={(e) => setFormData({ ...formData, carBrandId: e.target.value || null })}
                    placeholder="Например: Toyota"
                  />
                </FormField>

                {/* Model - точно по Figma */}
                <FormField
                  id="carModelText"
                  label="Модель"
                  hint="Опционально"
                >
                  <Input
                    type="text"
                    value={formData.carModelText || ""}
                    onChange={(e) => setFormData({ ...formData, carModelText: e.target.value })}
                    placeholder="Например: Land Cruiser"
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons - точно по Figma */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" size="lg" className="sm:flex-1">
              <Save className="w-4 h-4" />
              Сохранить изменения
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => router.push("/profile")}
              disabled={saving}
              className="sm:flex-1"
            >
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
