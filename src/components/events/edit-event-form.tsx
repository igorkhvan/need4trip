"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EventCategory, EventCustomFieldSchema, EventCustomFieldType } from "@/lib/types/event";

const CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = [
  { value: "weekend_trip", label: "Выезд на выходные" },
  { value: "technical_ride", label: "Техническая покатушка" },
  { value: "meeting", label: "Встреча" },
  { value: "training", label: "Тренировка" },
  { value: "service_day", label: "Сервис-день" },
  { value: "other", label: "Другое" },
];

const FIELD_TYPE_OPTIONS: { value: EventCustomFieldType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "number", label: "Число" },
  { value: "boolean", label: "Да / Нет" },
  { value: "enum", label: "Список значений" },
];

function buildEmptyField(order: number): EventCustomFieldSchema {
  return {
    id: `field-${crypto.randomUUID().slice(0, 8)}`,
    label: "",
    type: "text",
    required: false,
    order,
    options: [],
  };
}

interface EditEventFormProps {
  event: {
    id: string;
    title: string;
    description: string;
    category: EventCategory | null;
    dateTime: string;
    locationText: string;
    maxParticipants: number | null;
    customFieldsSchema: EventCustomFieldSchema[];
  };
  hasParticipants: boolean;
  isOwner: boolean;
  authMissing: boolean;
}

export function EditEventForm({
  event,
  hasParticipants,
  isOwner,
  authMissing,
}: EditEventFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(event.title ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [category, setCategory] = useState<EventCategory | null>(event.category ?? null);
  const [dateTime, setDateTime] = useState(() => {
    const d = event.dateTime ? new Date(event.dateTime) : new Date();
    return d.toISOString().slice(0, 16);
  });
  const [locationText, setLocationText] = useState(event.locationText ?? "");
  const [maxParticipants, setMaxParticipants] = useState<number | null>(
    event.maxParticipants ?? null
  );
  const [customFields, setCustomFields] = useState<EventCustomFieldSchema[]>(
    event.customFieldsSchema ?? []
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedFields = useMemo(
    () => [...customFields].sort((a, b) => a.order - b.order),
    [customFields]
  );

  const updateField = (id: string, patch: Partial<EventCustomFieldSchema>) => {
    setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const addField = () => {
    setCustomFields((prev) => [...prev, buildEmptyField(prev.length + 1)]);
  };

  const removeField = (id: string) => {
    setCustomFields((prev) => prev.filter((field) => field.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      if (!isOwner || authMissing) {
        setErrorMessage("Недостаточно прав / войдите через Telegram");
        return;
      }
      const payload = {
        title,
        description,
        category,
        dateTime: new Date(dateTime).toISOString(),
        locationText,
        maxParticipants,
        ...(hasParticipants ? {} : { customFieldsSchema: sortedFields }),
      };
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setErrorMessage("Недостаточно прав / войдите через Telegram");
        } else if (res.status === 409) {
          setErrorMessage("Лимит участников достигнут");
        } else if (res.status === 400) {
          const body = await res.json().catch(() => ({}));
          setErrorMessage(body?.message || "Ошибка валидации");
        } else {
          const body = await res.json().catch(() => ({}));
          setErrorMessage(body?.message || "Не удалось сохранить ивент");
        }
        return;
      }
      router.push(`/events/${event.id}`);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Не удалось сохранить ивент");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Редактирование ивента</h1>
          <p className="text-muted-foreground">
            {hasParticipants
              ? "Есть участники — схема кастомных полей заблокирована."
              : "Можно обновить данные и схему кастомных полей."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/events/${event.id}`}>Назад</Link>
        </Button>
      </div>

      {authMissing && (
        <Alert variant="destructive">
          <AlertTitle>Требуется авторизация</AlertTitle>
          <AlertDescription>Войдите через Telegram, чтобы редактировать ивент.</AlertDescription>
        </Alert>
      )}
      {!isOwner && (
        <Alert variant="destructive">
          <AlertTitle>Нет прав</AlertTitle>
          <AlertDescription>Только владелец может редактировать ивент.</AlertDescription>
        </Alert>
      )}

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Основные данные</CardTitle>
            <CardDescription>Обновите описание, дату и лимиты.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Название</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={authMissing || !isOwner}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Категория</Label>
                <Select
                  value={category ?? undefined}
                  onValueChange={(val) => setCategory(val as EventCategory)}
                  disabled={authMissing || !isOwner}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTime">Дата и время</Label>
                <Input
                  id="dateTime"
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  required
                  disabled={authMissing || !isOwner}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Макс. экипажей</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min={1}
                  value={maxParticipants ?? ""}
                  onChange={(e) =>
                    setMaxParticipants(e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="Необязательное поле"
                  disabled={authMissing || !isOwner}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationText">Локация (текстом)</Label>
              <Input
                id="locationText"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                required
                disabled={authMissing || !isOwner}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание ивента</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={authMissing || !isOwner}
              />
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2 border-t bg-muted/30">
            {errorMessage && <div className="mr-auto text-sm text-red-600">{errorMessage}</div>}
            <Button type="submit" disabled={isSubmitting || authMissing || !isOwner}>
              {isSubmitting ? "Сохраняем..." : "Сохранить"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Кастомные поля регистрации</CardTitle>
          <CardDescription>
            {hasParticipants
              ? "Редактирование запрещено: есть зарегистрированные участники."
              : "Можно менять схему кастомных полей."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedFields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border bg-background px-4 py-3 md:grid-cols-4 md:items-center"
            >
              <div className="space-y-1 md:col-span-2">
                <Label>Метка</Label>
                <Input
                  value={field.label}
                  placeholder="Название поля"
                  disabled={hasParticipants || authMissing || !isOwner}
                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Тип</Label>
                <Select
                  value={field.type}
                  disabled={hasParticipants || authMissing || !isOwner}
                  onValueChange={(value) =>
                    updateField(field.id, { type: value as EventCustomFieldType, options: [] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Обязательное</Label>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={field.required}
                    disabled={hasParticipants || authMissing || !isOwner}
                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  />
                  <span className="text-sm text-muted-foreground">Да</span>
                </div>
              </div>
              {field.type === "enum" && (
                <div className="md:col-span-4">
                  <Label>Варианты (через запятую)</Label>
                  <Input
                    value={field.options?.join(", ") ?? ""}
                    disabled={hasParticipants || authMissing || !isOwner}
                    onChange={(e) =>
                      updateField(field.id, {
                        options: e.target.value
                          .split(",")
                          .map((opt) => opt.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              )}
              <div className="flex items-center justify-between md:col-span-4">
                <span className="text-xs text-muted-foreground">Порядок: {index + 1}</span>
                {!hasParticipants && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(field.id)}
                    disabled={authMissing || !isOwner}
                  >
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!hasParticipants && (
            <Button
              type="button"
              variant="outline"
              onClick={addField}
              disabled={authMissing || !isOwner}
            >
              Добавить поле
            </Button>
          )}
          {hasParticipants && sortedFields.length === 0 && (
            <p className="text-sm text-muted-foreground">Кастомные поля не заданы.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
