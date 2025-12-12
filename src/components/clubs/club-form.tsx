/**
 * Club Form Component
 * 
 * Форма создания и редактирования клуба
 */

"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
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
    city: club?.city ?? "",
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
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Название клуба <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Например: OFF-ROAD Москва"
          disabled={loading}
        />
      </div>

      {/* Описание */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Описание
        </label>
        <textarea
          id="description"
          rows={4}
          value={formData.description ?? ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          placeholder="Расскажите о вашем клубе..."
          disabled={loading}
        />
      </div>

      {/* Город */}
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
          Город
        </label>
        <input
          type="text"
          id="city"
          value={formData.city ?? ""}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Москва"
          disabled={loading}
        />
      </div>

      {/* URL логотипа */}
      <div>
        <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2">
          URL логотипа
        </label>
        <input
          type="url"
          id="logoUrl"
          value={formData.logoUrl ?? ""}
          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
      <div>
        <label htmlFor="telegramUrl" className="block text-sm font-medium text-gray-700 mb-2">
          Ссылка на Telegram
        </label>
        <input
          type="url"
          id="telegramUrl"
          value={formData.telegramUrl ?? ""}
          onChange={(e) => setFormData({ ...formData, telegramUrl: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="https://t.me/your_club"
          disabled={loading}
        />
      </div>

      {/* Сайт */}
      <div>
        <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-2">
          Сайт клуба
        </label>
        <input
          type="url"
          id="websiteUrl"
          value={formData.websiteUrl ?? ""}
          onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="https://yourclub.com"
          disabled={loading}
        />
      </div>

      {/* Ошибка */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Кнопки */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading || !formData.name.trim()}
          className="flex-1 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner size="sm" />
              <span>Сохранение...</span>
            </>
          ) : mode === "create" ? (
            "Создать клуб"
          ) : (
            "Сохранить изменения"
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}

