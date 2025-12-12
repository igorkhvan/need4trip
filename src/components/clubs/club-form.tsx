/**
 * Club Form Component
 * 
 * Форма создания и редактирования клуба
 */

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { getErrorMessage } from "@/lib/utils/errors";
import type { Club, ClubCreateInput } from "@/lib/types/club";

interface ClubFormProps {
  mode: "create" | "edit";
  club?: Club;
  onSuccess?: (club: Club) => void;
  onCancel?: () => void;
}

export function ClubForm({ mode, club, onSuccess, onCancel }: ClubFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<ClubCreateInput>({
    name: club?.name ?? "",
    description: club?.description ?? "",
    cityId: club?.cityId ?? null,
    logoUrl: club?.logoUrl ?? "",
    telegramUrl: club?.telegramUrl ?? "",
    websiteUrl: club?.websiteUrl ?? "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const url = mode === "create" ? "/api/clubs" : `/api/clubs/${club!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Ошибка при сохранении клуба");
      }

      const { club: savedClub } = await res.json();

      if (onSuccess) {
        onSuccess(savedClub);
      } else {
        router.push(`/clubs/${savedClub.id}`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Название */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-[#111827]">
          Название клуба <span className="text-red-500">*</span>
        </Label>
        <Input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="h-12 rounded-xl border-2"
          placeholder="Например: OFF-ROAD Москва"
          disabled={loading}
        />
      </div>

      {/* Описание */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium text-[#111827]">
          Описание
        </Label>
        <Textarea
          id="description"
          rows={4}
          value={formData.description ?? ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="rounded-xl border-2"
          placeholder="Расскажите о вашем клубе..."
          disabled={loading}
        />
      </div>

      {/* Город */}
      <div>
        <Label className="text-sm font-medium text-[#111827]">
          Город
        </Label>
        <CityAutocomplete
          value={formData.cityId}
          onChange={(newCityId, city) => {
            setFormData({ ...formData, cityId: newCityId });
          }}
          placeholder="Выберите город..."
          disabled={loading}
        />
      </div>

      {/* URL логотипа */}
      <div className="space-y-2">
        <Label htmlFor="logoUrl" className="text-sm font-medium text-[#111827]">
          URL логотипа
        </Label>
        <Input
          type="url"
          id="logoUrl"
          value={formData.logoUrl ?? ""}
          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
          className="h-12 rounded-xl border-2"
          placeholder="https://example.com/logo.png"
          disabled={loading}
        />
        {formData.logoUrl && (
          <div className="mt-2">
            <img
              src={formData.logoUrl}
              alt="Предпросмотр"
              className="w-16 h-16 rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      {/* Telegram */}
      <div className="space-y-2">
        <Label htmlFor="telegramUrl" className="text-sm font-medium text-[#111827]">
          Ссылка на Telegram
        </Label>
        <Input
          type="url"
          id="telegramUrl"
          value={formData.telegramUrl ?? ""}
          onChange={(e) => setFormData({ ...formData, telegramUrl: e.target.value })}
          className="h-12 rounded-xl border-2"
          placeholder="https://t.me/your_club"
          disabled={loading}
        />
      </div>

      {/* Сайт */}
      <div className="space-y-2">
        <Label htmlFor="websiteUrl" className="text-sm font-medium text-[#111827]">
          Сайт клуба
        </Label>
        <Input
          type="url"
          id="websiteUrl"
          value={formData.websiteUrl ?? ""}
          onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
          className="h-12 rounded-xl border-2"
          placeholder="https://yourclub.com"
          disabled={loading}
        />
      </div>

      {/* Ошибка */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Кнопки */}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={loading || !formData.name.trim()}
          className="flex-1"
        >
          {loading ? "Сохранение..." : mode === "create" ? "Создать клуб" : "Сохранить изменения"}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Отмена
          </Button>
        )}
      </div>
    </form>
  );
}

