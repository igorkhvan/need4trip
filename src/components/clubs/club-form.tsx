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
import { Textarea } from "@/components/ui/textarea";
import { CityMultiSelect } from "@/components/ui/city-multi-select";
import { FormField } from "@/components/ui/form-field";
import { getErrorMessage } from "@/lib/types/errors";
import { scrollToFirstError } from "@/lib/utils/form-validation";
import type { Club, ClubCreateInput, ClubUpdateInput } from "@/lib/types/club";
import type { City } from "@/lib/types/city";
import { toast, showError, TOAST } from "@/lib/utils/toastHelpers";
import { usePaywall } from "@/components/billing/paywall-modal";

interface ClubFormProps {
  mode: "create" | "edit";
  club?: Club;
  onSuccess?: (club: Club) => void;
  onCancel?: () => void;
}

export function ClubForm({ mode, club, onSuccess, onCancel }: ClubFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // ⚡ Billing v2.0: Paywall hook (only for club creation)
  const { showPaywall, PaywallModalComponent } = usePaywall();

  // Form state
  const [formData, setFormData] = useState({
    name: club?.name ?? "",
    description: club?.description ?? "",
    cityIds: club?.cityIds ?? [],
    cities: club?.cities ?? [],
    logoUrl: club?.logoUrl ?? "",
    telegramUrl: club?.telegramUrl ?? "",
    websiteUrl: club?.websiteUrl ?? "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = "Название обязательно";
    }
    if (formData.cityIds.length === 0) {
      errors.cityIds = "Выберите хотя бы один город";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      
      // Scroll to first error field
      setTimeout(() => {
        scrollToFirstError({ offset: 100 });
      }, 100);
      
      return;
    }
    
    // Clear errors if validation passed
    setFieldErrors({});

    try {
      const url = mode === "create" ? "/api/clubs" : `/api/clubs/${club!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const payload = {
        name: formData.name,
        description: formData.description || null,
        cityIds: formData.cityIds,
        logoUrl: formData.logoUrl || null,
        telegramUrl: formData.telegramUrl || null,
        websiteUrl: formData.websiteUrl || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Parse JSON once for all cases
      const json = await res.json();

      if (!res.ok) {
        // ⚡ Billing v2.0: Handle 402 Paywall for club creation
        if (res.status === 402 && mode === "create") {
          const errorData = json.error || json;
          // PaywallError format: { success: false, error: { code, message, details } }
          // details contains full PaywallError payload (reason, currentPlanId, etc.)
          if (errorData.details?.code === 'PAYWALL' || errorData.code === 'PAYWALL') {
            showPaywall(errorData.details || errorData);
            setLoading(false);
            return;
          }
        }
        throw new Error(json.error?.message || json.message || "Ошибка при сохранении клуба");
      }

      // SSOT_ARCHITECTURE §10.3: Handle canonical envelope { success, data: { club } }
      const savedClub = json.data?.club || json.club;

      // Defensive: ensure club was returned with id
      if (!savedClub?.id) {
        console.error('[ClubForm] No club.id in response:', json);
        throw new Error("Не удалось получить данные клуба");
      }

      // Show success toast only after valid data confirmed
      toast(mode === "create" ? TOAST.club.created : TOAST.club.updated);
      
      if (onSuccess) {
        onSuccess(savedClub);
        setLoading(false);
      } else {
        // ✅ Mark as redirecting BEFORE navigation (keeps button disabled)
        // Pattern: SSOT_ARCHITECTURE § ActionController - prevents race condition
        setIsRedirecting(true);
        router.push(`/clubs/${savedClub.id}`);
        // Note: loading stays true, isRedirecting keeps button disabled until unmount
      }
    } catch (err) {
      showError(err, mode === "create" ? "Не удалось создать клуб" : "Не удалось сохранить изменения");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Название */}
      <FormField
        id="name"
        label="Название клуба"
        required
        error={fieldErrors.name}
      >
        <Input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={fieldErrors.name ? "border-red-500 focus:border-red-500" : ""}
          placeholder="Например: OFF-ROAD Алматы"
          disabled={loading || isRedirecting}
        />
      </FormField>

      {/* Описание */}
      <FormField
        id="description"
        label="Описание"
        hint="Расскажите о вашем клубе"
      >
        <Textarea
          id="description"
          rows={4}
          value={formData.description ?? ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Расскажите о вашем клубе..."
          disabled={loading || isRedirecting}
        />
      </FormField>

      {/* Города */}
      <FormField
        id="cityIds"
        label="Города клуба"
        required
        error={fieldErrors.cityIds}
        hint="Выберите города, в которых действует ваш клуб (до 10 городов)"
      >
        <CityMultiSelect
          value={formData.cityIds}
          onChange={(cityIds, cities) => {
            setFormData({ ...formData, cityIds, cities });
          }}
          placeholder="Выберите города..."
          disabled={loading || isRedirecting}
          error={!!fieldErrors.cityIds}
          maxItems={10}
        />
      </FormField>

      {/* URL логотипа */}
      <FormField
        id="logoUrl"
        label="URL логотипа"
        hint="Ссылка на изображение логотипа клуба"
      >
        <Input
          type="url"
          id="logoUrl"
          value={formData.logoUrl ?? ""}
          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
          placeholder="https://example.com/logo.png"
          disabled={loading || isRedirecting}
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
      </FormField>

      {/* Telegram */}
      <FormField
        id="telegramUrl"
        label="Ссылка на Telegram"
        hint="Ссылка на Telegram-канал или группу клуба"
      >
        <Input
          type="url"
          id="telegramUrl"
          value={formData.telegramUrl ?? ""}
          onChange={(e) => setFormData({ ...formData, telegramUrl: e.target.value })}
          placeholder="https://t.me/your_club"
          disabled={loading || isRedirecting}
        />
      </FormField>

      {/* Сайт */}
      <FormField
        id="websiteUrl"
        label="Сайт клуба"
        hint="Официальный сайт клуба"
      >
        <Input
          type="url"
          id="websiteUrl"
          value={formData.websiteUrl ?? ""}
          onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
          placeholder="https://yourclub.com"
          disabled={loading || isRedirecting}
        />
      </FormField>

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
          disabled={loading || isRedirecting}
          className="flex-1"
        >
          {/* SSOT_UI_COPY §2.2: Button action uses ellipsis character (…) */}
          {isRedirecting 
            ? "Переход…" 
            : loading 
              ? "Сохранение…" 
              : mode === "create" 
                ? "Создать клуб" 
                : "Сохранить изменения"}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading || isRedirecting}
          >
            Отмена
          </Button>
        )}
      </div>
      
      {/* ⚡ Billing v2.0: PaywallModal for club creation 402 */}
      {PaywallModalComponent}
    </form>
  );
}

