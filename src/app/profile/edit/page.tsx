/**
 * Profile Edit Page
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
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[14px]">Назад к профилю</span>
          </Link>
          <h1 className="text-[32px] font-bold text-[#111827] mb-1">Редактировать профиль</h1>
          <p className="text-[#6B7280] text-[14px]">
            Обновите свою личную информацию и настройки
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl text-[#991B1B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="text-[18px] font-semibold text-[#111827] mb-3">Личная информация</h3>
              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label className="text-[13px] font-medium mb-2 block text-[#111827]">
                    Имя <span className="text-[#EF4444]">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Введите имя"
                    className={fieldErrors.name ? "border-[#EF4444]" : ""}
                    required
                  />
                  {fieldErrors.name && (
                    <p className="text-[13px] text-[#EF4444] mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                {/* City */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium text-[#111827]">
                      Город
                    </label>
                    <span className="text-[12px] text-[#6B7280]">Опционально</span>
                  </div>
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
            </CardContent>
          </Card>

          {/* Car Information */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="text-[18px] font-semibold text-[#111827] mb-3">Информация об автомобиле</h3>
              <div className="space-y-3">
                {/* Brand */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium text-[#111827]">
                      Марка
                    </label>
                    <span className="text-[12px] text-[#6B7280]">Опционально</span>
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

                {/* Model */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium text-[#111827]">
                      Модель
                    </label>
                    <span className="text-[12px] text-[#6B7280]">Опционально</span>
                  </div>
                  <Input
                    type="text"
                    value={formData.carModelText || ""}
                    onChange={(e) => setFormData({ ...formData, carModelText: e.target.value })}
                    placeholder="Например: Land Cruiser 200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" size="lg" disabled={saving} className="sm:flex-1">
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
              size="lg"
              onClick={() => router.push("/profile")}
              disabled={saving}
              className="sm:flex-1"
            >
              Отмена
            </Button>
          </div>
        </form>

        {/* Help text */}
        <p className="text-[13px] text-center text-[#6B7280] mt-6">
          Ваша информация видна только участникам ваших событий
        </p>
      </div>
    </div>
  );
}
