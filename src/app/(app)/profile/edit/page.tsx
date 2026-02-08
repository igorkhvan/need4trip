/**
 * Profile Edit Page - Точное соответствие Figma дизайну
 * 
 * Edit user profile (name, city, car)
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Camera } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { FormField } from "@/components/ui/form-field";
import { MultiBrandSelect, MultiBrandSelectOption } from "@/components/multi-brand-select";
import { ProfileEditSkeleton } from "@/components/ui/skeletons";
import { scrollToFirstError } from "@/lib/utils/form-validation";
import type { City } from "@/lib/types/city";
import { toast, showError, TOAST } from "@/lib/utils/toastHelpers";

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
        showError(err, "Не удалось загрузить профиль");
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return; // guard от double-submit через Enter
    
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
      
      // Show success toast and redirect
      toast(TOAST.profile.updated);
      router.push("/profile");
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      showError(err, "Не удалось обновить профиль");
    } finally {
      setSaving(false);
    }
  };

  // SSOT: SSOT_UI_ASYNC_PATTERNS.md §9 — Spinner-only pages forbidden
  // SSOT: SSOT_UX_GOVERNANCE.md §3.3 — Skeletons MUST appear immediately on first load
  // FIX: Replaced spinner with ProfileEditSkeleton
  if (loading) {
    return <ProfileEditSkeleton />;
  }

  // SSOT: SSOT_UX_GOVERNANCE.md §2.2 — MANAGEMENT pages MUST use STANDARD width
  // SSOT: SSOT_UX_NORMALIZATION_MATRIX.md §4.4 — MANAGEMENT → max-w-7xl
  // FIX: Removed narrow max-w-3xl wrapper, page-container provided by (app) layout
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Назад к профилю</span>
      </Link>

      {/* Header */}
      <div>
        <h1 className="mb-1">Редактировать профиль</h1>
        <p className="text-muted-foreground text-sm">
          Обновите свою личную информацию и настройки
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Section */}
        <Card>
          <CardContent className="p-5 md:p-6">
            <h3 className="mb-4">Фото профиля</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
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
                <button
                  type="button"
                  className="absolute bottom-0 right-0 p-2 bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors shadow-lg"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Рекомендуемый размер: 400x400 пикселей
                </p>
                <Button type="button" variant="secondary" size="sm">
                  Загрузить фото
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3">Личная информация</h3>
            <div className="space-y-3">
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

        {/* Car Information */}
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-3">Информация об автомобиле</h3>
            <div className="space-y-3">
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" size="lg" className="sm:flex-1" disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение…' : 'Сохранить изменения'}
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
  );
}
