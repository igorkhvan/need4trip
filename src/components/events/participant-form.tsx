"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Event, EventCustomFieldSchema, EventCustomFieldType } from "@/lib/types/event";
import { ParticipantRole } from "@/lib/types/participant";
import { useCurrentUser } from "@/components/auth/use-current-user";

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

function getDefaultValue(type: EventCustomFieldType) {
  switch (type) {
    case "boolean":
      return false;
    case "number":
      return 0;
    case "text":
    case "enum":
    default:
      return "";
  }
}

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
  const { user } = useCurrentUser();
  
  const preferredName =
    initialValues?.displayName ||
    user?.telegramHandle?.trim() ||
    user?.name?.trim() ||
    user?.email?.split("@")?.[0] ||
    (user ? user.id.slice(0, 8) : "");

  const [displayName, setDisplayName] = useState<string>(preferredName ?? "");
  const [role, setRole] = useState<ParticipantRole>(initialValues?.role || "participant");
  const [customValues, setCustomValues] = useState<CustomValues>(() => {
    if (mode === "edit" && initialValues?.customFieldValues) {
      return initialValues.customFieldValues as CustomValues;
    }
    return Object.fromEntries(
      (customFieldsSchema || []).map((field) => [field.id, getDefaultValue(field.type)])
    );
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const sortedFields = [...(customFieldsSchema || [])].sort((a, b) => a.order - b.order);

  // Удален проблемный useEffect - имя устанавливается только через useState при инициализации

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
        if (value === "" || value === null || Number.isNaN(Number(value))) {
          issues[field.id] = "Укажите значение";
        }
      } else if (field.type === "enum" || field.type === "text") {
        if (!value || String(value).trim().length === 0) {
          issues[field.id] = "Заполните поле";
        }
      } else if (field.type === "boolean") {
        if (value === undefined || value === null) {
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

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          throw new Error("Недостаточно прав / войдите через Telegram");
        }
        if (res.status === 409) {
          throw new Error(
            body?.message ||
              body?.error ||
              "Конфликт: вы уже зарегистрированы, достигнут лимит или роль занята"
          );
        }
        if (res.status === 400) {
          throw new Error(body?.message || "Ошибка валидации");
        }
        throw new Error(body?.message || body?.error || "Не удалось сохранить данные");
      }

      if (mode === "create") {
        setDisplayName("");
        setRole("participant");
        setCustomValues(
          Object.fromEntries(
            sortedFields.map((field) => [field.id, getDefaultValue(field.type)])
          )
        );
      } else {
        toast({ 
          title: "Обновлено", 
          description: "Регистрация успешно сохранена" 
        });
      }

      setFieldErrors({});
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка. Повторите попытку.");
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
    const labelContent = (
      <>
        {field.label}
        {field.required && <span className="ml-0.5 text-red-600">*</span>}
      </>
    );
    const value = customValues[field.id];

    switch (field.type) {
      case "number":
        return (
          <div className="space-y-2" key={field.id}>
            <Label className="flex items-center gap-1 text-sm">{labelContent}</Label>
            <Input
              type="number"
              value={value as number}
              className={errorText ? "border-red-500 focus-visible:ring-red-500" : ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
            />
            <div className="min-h-[28px] text-left text-[13px] text-red-600">{errorText ?? ""}</div>
          </div>
        );
      case "boolean":
        return (
          <div
            className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
            key={field.id}
          >
            <Checkbox
              checked={Boolean(value)}
              onChange={(e) => handleChange(field.id, e.target.checked)}
            />
            <Label className="flex items-center gap-1 text-sm">{labelContent}</Label>
          </div>
        );
      case "enum":
        return (
          <div className="space-y-2" key={field.id}>
            <Label className="flex items-center gap-1 text-sm">{labelContent}</Label>
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
            <div className="min-h-[28px] text-left text-[13px] text-red-600">{errorText ?? ""}</div>
          </div>
        );
      case "text":
      default:
        return (
          <div className="space-y-2" key={field.id}>
            <Label className="flex items-center gap-1 text-sm">{labelContent}</Label>
            <Input
              value={(value as string) ?? ""}
              className={errorText ? "border-red-500 focus-visible:ring-red-500" : ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder=""
            />
            <div className="min-h-[28px] text-left text-[13px] text-red-600">{errorText ?? ""}</div>
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
      {event?.isPaid && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
          Это платное мероприятие. Оплата и подтверждение согласовываются с организатором.
          {event.price ? ` Стоимость: ${event.price} ${event.currency ?? ""}.` : ""}
        </div>
      )}
      {event?.rules && event.rules.trim().length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm text-blue-800">
          Ознакомьтесь с правилами в карточке события. Отправляя форму, вы подтверждаете согласие.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-medium">
            Имя водителя / экипажа
          </Label>
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
          <div className="min-h-[28px] text-left text-[13px] text-red-600">
            {fieldErrors.displayName ?? ""}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Роль</Label>
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
          <div className="min-h-[28px] text-left text-[13px] text-[#6B7280]">
          </div>
        </div>
      </div>

      {sortedFields.length > 0 && (
        <div className="space-y-4">{sortedFields.map((field) => renderField(field))}</div>
      )}

      <div className="min-h-[20px] text-left text-sm text-red-600">{error ?? ""}</div>
      
      {mode === "create" && (
        <p className="text-left text-sm text-[#6B7280]">
          После отправки вы появитесь в списке участников, а организатор получит ваши данные.
        </p>
      )}

      <div className="flex justify-end pb-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Сохраняем..." : mode === "create" ? "Зарегистрироваться" : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}

