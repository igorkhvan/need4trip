"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Event, EventCustomFieldSchema, EventCustomFieldType } from "@/lib/types/event";
import { ParticipantRole } from "@/lib/types/participant";
import { useAuth } from "@/components/auth/auth-provider";
import { useSaveScroll } from "@/hooks/use-scroll-save";
import { getDefaultCustomFieldValue } from "@/lib/utils/customFields";
import { parseApiResponse } from "@/lib/types/errors";
import { scrollToFirstError } from "@/lib/utils/form-validation";
import { toast, showError, TOAST } from "@/lib/utils/toastHelpers";
import { formatEventPriceInline } from "@/lib/utils/eventFormatters";

interface ParticipantFormProps {
  mode: "create" | "edit";
  eventId: string;
  participantId?: string;
  customFieldsSchema: EventCustomFieldSchema[];
  event?: Event;
  initialValues?: {
    displayName?: string;
    role?: ParticipantRole;
    customFieldValues?: Record<string, unknown>;
  };
  onSuccess?: () => void;
}

type CustomValues = Record<string, string | number | boolean>;

export function ParticipantForm({
  mode,
  eventId,
  participantId,
  customFieldsSchema,
  event,
  initialValues,
  onSuccess,
}: ParticipantFormProps) {
  const router = useRouter();
  // ⚡ PERFORMANCE: Use auth context instead of useCurrentUser hook
  const { user } = useAuth();
  const saveScroll = useSaveScroll();
  
  // При создании - берем из Telegram, при редактировании - из регистрации
  const initialDisplayName = mode === "edit" 
    ? (initialValues?.displayName || "")
    : (
      user?.name?.trim() ||
      user?.telegramHandle?.trim() ||
      user?.email?.split("@")?.[0] ||
      (user ? user.id.slice(0, 8) : "")
    );

  const [displayName, setDisplayName] = useState<string>(initialDisplayName);
  const [role, setRole] = useState<ParticipantRole>(initialValues?.role || "participant");
  const [customValues, setCustomValues] = useState<CustomValues>(() => {
    if (mode === "edit" && initialValues?.customFieldValues) {
      // Для boolean полей всегда конвертируем в true/false, не оставляем null/undefined
      return Object.fromEntries(
        customFieldsSchema.map((field) => {
          const value = initialValues.customFieldValues?.[field.id];
          if (field.type === "boolean") {
            return [field.id, Boolean(value)];
          } else {
            return [field.id, value ?? getDefaultCustomFieldValue(field.type)];
          }
        })
      ) as CustomValues;
    }
    return Object.fromEntries(
      (customFieldsSchema || []).map((field) => [field.id, getDefaultCustomFieldValue(field.type)])
    );
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Флаг: был ли установлен начальный displayName из user
  const hasSetInitialName = useRef(false);

  const sortedFields = [...(customFieldsSchema || [])].sort((a, b) => a.order - b.order);

  // Обновляем displayName когда загрузится user (только один раз в режиме создания)
  useEffect(() => {
    if (mode === "create" && !hasSetInitialName.current && user) {
      const name = 
        user.name?.trim() ||
        user.telegramHandle?.trim() ||
        user.email?.split("@")?.[0] ||
        user.id.slice(0, 8);
      
      if (name) {
        setDisplayName(name);
        hasSetInitialName.current = true;
      }
    }
  }, [mode, user]);

  const validate = () => {
    const trimmedName = displayName.trim();
    const issues: Record<string, string> = {};

    if (!trimmedName || trimmedName.length > 100) {
      issues.displayName = "Введите имя экипажа (до 100 символов).";
    }

    sortedFields.forEach((field) => {
      const value = customValues[field.id];
      if (!field.required) return;

      if (field.type === "number") {
        // Для обязательных числовых полей: 0 считается как пустое значение
        const numValue = Number(value);
        if (value === "" || value === null || Number.isNaN(numValue) || numValue === 0) {
          issues[field.id] = "Укажите значение";
        }
      } else if (field.type === "enum" || field.type === "text") {
        if (!value || String(value).trim().length === 0) {
          issues[field.id] = "Заполните поле";
        }
      } else if (field.type === "boolean") {
        // Для boolean полей: если обязательное, то должно быть явно true
        // (false считается валидным ответом "Нет")
        if (typeof value !== "boolean") {
          issues[field.id] = "Укажите значение";
        }
      }
    });

    return issues;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const issues = validate();
    if (Object.keys(issues).length) {
      setFieldErrors(issues);
      
      // Scroll to first error field
      setTimeout(() => {
        scrollToFirstError({ offset: 100 });
      }, 100);
      
      return;
    }

    setIsSubmitting(true);

    const preparedValues: Record<string, unknown> = {};
    sortedFields.forEach((field) => {
      const value = customValues[field.id];
      if (field.type === "number") {
        preparedValues[field.id] =
          value === "" || value === null || Number.isNaN(Number(value))
            ? null
            : Number(value);
      } else if (field.type === "boolean") {
        // Всегда сохраняем boolean: true если checked, false если unchecked
        // Не сохраняем null для чекбоксов - false означает "Нет"
        preparedValues[field.id] = Boolean(value);
      } else {
        preparedValues[field.id] = value ?? "";
      }
    });

    try {
      let url: string;
      let method: string;
      let body: Record<string, unknown>;

      if (mode === "create") {
        url = `/api/events/${eventId}/participants`;
        method = "POST";
        body = {
          displayName: displayName.trim() || "Без имени",
          role,
          customFieldValues: preparedValues,
        };
      } else {
        url = `/api/events/${eventId}/participants/${participantId}`;
        method = "PATCH";
        body = {
          displayName: displayName.trim() || "Без имени",
          role,
          customFieldValues: preparedValues,
        };
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // parseApiResponse throws ClientError if response is not ok
      await parseApiResponse(res);

      if (mode === "create") {
        setDisplayName("");
        setRole("participant");
        setCustomValues(
          Object.fromEntries(
            sortedFields.map((field) => [field.id, getDefaultCustomFieldValue(field.type)])
          )
        );
        toast(TOAST.participant.created);
      } else {
        toast(TOAST.participant.updated);
      }

      setFieldErrors({});
      
      // Сохранить scroll position ПЕРЕД router.refresh()
      saveScroll();
      
      router.refresh();
      onSuccess?.();
    } catch (err) {
      showError(err, "Не удалось зарегистрироваться на событие");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (id: string, value: string | number | boolean) => {
    setCustomValues((prev) => ({ ...prev, [id]: value }));
    setFieldErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const renderField = (field: EventCustomFieldSchema) => {
    const errorText = fieldErrors[field.id];
    const value = customValues[field.id];

    switch (field.type) {
      case "number":
        return (
          <FormField
            key={field.id}
            id={`field-${field.id}`}
            label={field.label}
            required={field.required}
            error={errorText}
          >
            <Input
              type="number"
              value={value as number}
              className={errorText ? "border-red-500 focus-visible:ring-red-500" : ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
            />
          </FormField>
        );
      case "boolean":
        return (
          <div
            key={field.id}
            className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
          >
            <Checkbox
              checked={Boolean(value)}
              onChange={(e) => handleChange(field.id, e.target.checked)}
            />
            <label className="flex items-center gap-1 text-sm cursor-pointer select-none">
              {field.label}
              {field.required && <span className="ml-0.5 text-red-600">*</span>}
            </label>
          </div>
        );
      case "enum":
        return (
          <FormField
            key={field.id}
            id={`field-${field.id}`}
            label={field.label}
            required={field.required}
            error={errorText}
          >
            <Select
              value={(value as string) ?? ""}
              onValueChange={(val) => handleChange(field.id, val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите значение" />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        );
      case "text":
      default:
        return (
          <FormField
            key={field.id}
            id={`field-${field.id}`}
            label={field.label}
            required={field.required}
            error={errorText}
          >
            <Input
              value={(value as string) ?? ""}
              className={errorText ? "border-red-500 focus-visible:ring-red-500" : ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder=""
            />
          </FormField>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6 shadow-sm">
      {event?.isPaid && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
          Это платное мероприятие. Оплата и подтверждение согласовываются с организатором.
          {formatEventPriceInline(event)}
        </div>
      )}
      {event?.rules && event.rules.trim().length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm text-blue-800">
          Ознакомьтесь с правилами в карточке события. Отправляя форму, вы подтверждаете согласие.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <FormField
          id="displayName"
          label="Имя водителя / экипажа"
          required
          error={fieldErrors.displayName}
        >
          <Input
            id="displayName"
            placeholder="Ник или имя"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (fieldErrors.displayName) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.displayName;
                  return next;
                });
              }
            }}
            className="h-12"
          />
        </FormField>

        <FormField
          id="role"
          label="Роль"
          required
        >
          <Select
            value={role}
            onValueChange={(value) => setRole(value as ParticipantRole)}
          >
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="participant">Участник</SelectItem>
              <SelectItem value="leader">Лидер</SelectItem>
              <SelectItem value="tail">Замыкающий</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {sortedFields.length > 0 && (
        <div className="space-y-4">{sortedFields.map((field) => renderField(field))}</div>
      )}

      {error && (
        <div className="text-left text-sm text-red-600">{error}</div>
      )}
      
      {mode === "create" && (
        <p className="text-left text-sm text-muted-foreground">
          После отправки вы появитесь в списке участников, а организатор получит ваши данные.
        </p>
      )}

      {/* SSOT: SSOT_UI_COPY §2.2 - Button (action): `Сохранение…` */}
      {/* FIX: Normalized "Сохраняем..." → "Сохранение…" */}
      <div className="flex justify-end pb-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Сохранение…" : mode === "create" ? "Зарегистрироваться" : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}

