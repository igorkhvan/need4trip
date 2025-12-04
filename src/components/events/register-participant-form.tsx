"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventCustomFieldSchema, EventCustomFieldType } from "@/lib/types/event";
import { ParticipantRole } from "@/lib/types/participant";

interface RegisterParticipantFormProps {
  eventId: string;
  customFieldsSchema: EventCustomFieldSchema[];
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

export function RegisterParticipantForm({
  eventId,
  customFieldsSchema,
}: RegisterParticipantFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<ParticipantRole>("participant");
  const [customValues, setCustomValues] = useState<CustomValues>(() =>
    Object.fromEntries(
      (customFieldsSchema || []).map((field) => [field.id, getDefaultValue(field.type)])
    )
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedFields = [...(customFieldsSchema || [])].sort((a, b) => a.order - b.order);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      const res = await fetch(`/api/events/${eventId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || "Без имени",
          role,
          customFieldValues: preparedValues,
        }),
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
        throw new Error(body?.message || body?.error || "Не удалось зарегистрировать участника");
      }
      setDisplayName("");
      setRole("participant");
      setCustomValues(
        Object.fromEntries(
          sortedFields.map((field) => [field.id, getDefaultValue(field.type)])
        )
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка. Повторите попытку.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (id: string, value: string | number | boolean) => {
    setCustomValues((prev) => ({ ...prev, [id]: value }));
  };

  const renderField = (field: EventCustomFieldSchema) => {
    const labelContent = (
      <>
        {field.label}
        {field.required && <span className="ml-0.5 text-red-600">*</span>}
      </>
    );

    const required = field.required;
    const value = customValues[field.id];

    switch (field.type) {
      case "number":
        return (
          <div className="space-y-2" key={field.id}>
            <Label className="flex items-center gap-1 text-sm">{labelContent}</Label>
            <Input
              type="number"
              value={value as number}
              required={required}
              onChange={(e) => handleChange(field.id, e.target.value)}
            />
          </div>
        );
      case "boolean":
        return (
          <div
            className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
            key={field.id}
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
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
          </div>
        );
      case "text":
      default:
        return (
          <div className="space-y-2" key={field.id}>
            <Label className="flex items-center gap-1 text-sm">{labelContent}</Label>
            <Input
              value={(value as string) ?? ""}
              required={required}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder=""
            />
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div className="grid gap-4 md:grid-cols-[2fr,1fr] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-medium">
            Имя экипажа
          </Label>
          <Input
            id="displayName"
            placeholder="Ник или имя"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Роль</Label>
          <Select value={role} onValueChange={(value) => setRole(value as ParticipantRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="participant">Участник</SelectItem>
              <SelectItem value="leader">Лидер</SelectItem>
              <SelectItem value="tail">Замыкающий</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {sortedFields.length > 0 && (
        <div className="space-y-4">
          {sortedFields.map((field) => renderField(field))}
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Сохраняем..." : "+ Добавить участника"}
        </Button>
      </div>
    </form>
  );
}
