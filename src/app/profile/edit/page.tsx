/**
 * Profile Edit Page
 * 
 * Edit user profile (name, city, car)
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { MultiBrandSelect } from "@/components/multi-brand-select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import type { City } from "@/lib/types/city";

interface ProfileEditForm {
  name: string;
  cityId: string | null;
  city: City | null;
  carBrandId: string | null;
  carModelText: string | null;
  carYear: number | null;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<ProfileEditForm>({
    name: "",
    cityId: null,
    city: null,
    carBrandId: null,
    carModelText: "",
    carYear: null,
  });

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
          carYear: user.carYear || null,
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
          carYear: formData.carYear,
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
    <div className="page-container py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад в профиль
          </Link>
          <h1 className="text-4xl font-bold text-[#0F172A]">
            Редактировать профиль
          </h1>
          <p className="text-[#6B7280] mt-2">
            Обновите вашу информацию
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-semibold">
                Имя <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введите ваше имя"
                className={fieldErrors.name ? "border-red-500" : ""}
              />
              {fieldErrors.name && (
                <p className="text-sm text-red-500">{fieldErrors.name}</p>
              )}
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Город <span className="text-red-500">*</span>
              </Label>
              <CityAutocomplete
                value={formData.cityId}
                selectedCity={formData.city}
                onChange={(cityId, city) => {
                  setFormData({ ...formData, cityId, city });
                  if (fieldErrors.cityId) {
                    setFieldErrors({ ...fieldErrors, cityId: "" });
                  }
                }}
                errorMessage={fieldErrors.cityId}
              />
            </div>

            {/* Car Brand */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Марка автомобиля
              </Label>
              <MultiBrandSelect
                selectedBrandIds={formData.carBrandId ? [formData.carBrandId] : []}
                onChange={(brandIds) => {
                  setFormData({ ...formData, carBrandId: brandIds[0] || null });
                }}
                mode="single"
                placeholder="Выберите марку автомобиля"
              />
              <p className="text-sm text-gray-500">
                Необязательно. Поможет другим участникам
              </p>
            </div>

            {/* Car Model */}
            {formData.carBrandId && (
              <div className="space-y-2">
                <Label htmlFor="carModelText" className="text-base font-semibold">
                  Модель автомобиля
                </Label>
                <Input
                  id="carModelText"
                  value={formData.carModelText || ""}
                  onChange={(e) => setFormData({ ...formData, carModelText: e.target.value })}
                  placeholder="Например: Land Cruiser 200"
                />
                <p className="text-sm text-gray-500">
                  Укажите модель и комплектацию
                </p>
              </div>
            )}

            {/* Car Year */}
            {formData.carBrandId && (
              <div className="space-y-2">
                <Label htmlFor="carYear" className="text-base font-semibold">
                  Год выпуска
                </Label>
                <Input
                  id="carYear"
                  type="number"
                  value={formData.carYear || ""}
                  onChange={(e) => {
                    const year = e.target.value ? parseInt(e.target.value) : null;
                    setFormData({ ...formData, carYear: year });
                  }}
                  placeholder="2020"
                  min="1900"
                  max="2100"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/profile")}
                disabled={saving}
                className="flex-1"
              >
                Отмена
              </Button>
              
              <Button
                type="submit"
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Сохранить
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Help text */}
        <p className="text-sm text-center text-gray-500 mt-6">
          Ваша информация видна только участникам ваших событий
        </p>
      </div>
    </div>
  );
}

