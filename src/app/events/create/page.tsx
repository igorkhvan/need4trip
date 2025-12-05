"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CarBrand,
  EventCategory,
  EventCustomFieldSchema,
  EventCustomFieldType,
  VehicleTypeRequirement,
  Visibility,
} from "@/lib/types/event";

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

export default function CreateEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<EventCustomFieldSchema[]>([]);
  const [brands, setBrands] = useState<CarBrand[]>([]);
  const [allowedBrandIds, setAllowedBrandIds] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [vehicleType, setVehicleType] = useState<VehicleTypeRequirement>("any");
  const [rules, setRules] = useState<string>("");
  const [isClubEvent, setIsClubEvent] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState<string>("KZT");

  const sortedFields = useMemo(
    () => [...customFields].sort((a, b) => a.order - b.order),
    [customFields]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/car-brands");
        if (!res.ok) return;
        const data = (await res.json()) as { brands?: CarBrand[] };
        setBrands(data.brands ?? []);
      } catch (err) {
        console.error("Failed to load car brands", err);
      }
    };
    load();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const dateTime = formData.get("dateTime") as string;
    const maxParticipants = formData.get("maxParticipants") as string;
    const title = (formData.get("title") as string)?.trim() ?? "";
    const description = (formData.get("description") as string)?.trim() ?? "";

    const issues: Record<string, string> = {};

    if (title.length < 3) {
      setErrorMessage("Название должно быть от 3 символов.");
      return;
    }
    if (description.length < 1) {
      setErrorMessage("Описание не может быть пустым.");
      return;
    }

    sortedFields.forEach((field, idx) => {
      if (!field.label.trim()) {
        issues[`customFieldsSchema.${idx}.label`] = "Введите название поля";
      }
    });

    if (Object.keys(issues).length) {
      setFieldErrors(issues);
      return;
    }

    const payload = {
      title,
      description,
      category: (formData.get("category") as EventCategory | null) ?? null,
      dateTime: dateTime ? new Date(dateTime).toISOString() : new Date().toISOString(),
      locationText: (formData.get("locationText") as string) ?? "",
      locationLat: null,
      locationLng: null,
      maxParticipants: maxParticipants ? Number(maxParticipants) : null,
      customFieldsSchema: sortedFields,
      allowedBrandIds,
      visibility,
      vehicleTypeRequirement: vehicleType,
      rules: rules.trim() || null,
      isClubEvent,
      isPaid,
      price: isPaid ? (price ? Number(price) : null) : null,
      currency: isPaid ? currency || null : null,
    };

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          setErrorMessage("Недостаточно прав / войдите через Telegram");
          return;
        }
        if (res.status === 409) {
          setErrorMessage("Лимит участников достигнут");
          return;
        }
        const collected: Record<string, string> = {};
        const rawIssues = body?.details?.issues || body?.issues;
        if (Array.isArray(rawIssues)) {
          rawIssues.forEach((issue: unknown) => {
            const it = issue as { path?: unknown; message?: string };
            const path = Array.isArray(it?.path) ? (it.path as string[]).join(".") : "";
            if (path) collected[path] = it?.message || "Ошибка валидации";
          });
        }
        const fe = body?.details?.fieldErrors;
        if (fe && typeof fe === "object") {
          Object.entries(fe as Record<string, string[]>).forEach(([k, v]) => {
            if (v && v.length) collected[k] = v.join(", ");
          });
        }
        if (Object.keys(collected).length) {
          setFieldErrors(collected);
          setErrorMessage(null);
          return;
        }
        const stringifyDetails = (d: unknown) => {
          if (!d) return "";
          if (typeof d === "string") return d;
          if (typeof d === "object") {
            if ("fieldErrors" in (d as Record<string, unknown>)) {
              const fe = (d as { fieldErrors?: Record<string, string[]> }).fieldErrors;
              if (fe) {
                return Object.entries(fe)
                  .map(([key, msgs]) => `${key}: ${(msgs || []).join(", ")}`)
                  .join("; ");
              }
            }
            return JSON.stringify(d);
          }
          return String(d);
        };
        const details =
          stringifyDetails(body?.details) ||
          stringifyDetails(body?.message) ||
          stringifyDetails(body);
        throw new Error(body?.error ? `${body.error}${details ? `: ${details}` : ""}` : details);
      }
      router.push("/events");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message || "Не удалось создать ивент"
          : "Не удалось создать ивент"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (id: string, patch: Partial<EventCustomFieldSchema>) => {
    setCustomFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  };

  const addField = () => {
    setCustomFields((prev) => [...prev, buildEmptyField(prev.length + 1)]);
  };

  const removeField = (id: string) => {
    setCustomFields((prev) => prev.filter((field) => field.id !== id));
  };

  const fieldError = (path: string) => fieldErrors[path];

  const toggleBrand = (id: string) => {
    setAllowedBrandIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Ивент</p>
        <h1 className="text-3xl font-bold tracking-tight">Создание ивента</h1>
        <p className="text-sm text-muted-foreground">
          Опишите покатушку, добавьте кастомные поля для регистрации экипажей.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/events">← Назад к списку</Link>
          </Button>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Основные данные</CardTitle>
            <CardDescription>Обновите название, дату, лимиты и описание ивента.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="title">Название</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  className={
                    fieldError("title") ? "border-red-500 focus-visible:ring-red-500" : ""
                  }
                />
                {fieldError("title") && <p className="text-xs text-red-600">{fieldError("title")}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="category">Категория</Label>
                <Select name="category" defaultValue="weekend_trip">
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
              <div className="space-y-1">
                <Label htmlFor="dateTime">Дата и время</Label>
                <Input id="dateTime" name="dateTime" type="datetime-local" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="maxParticipants">Максимум экипажей</Label>
                <Input
                  id="maxParticipants"
                  name="maxParticipants"
                  type="number"
                  min={1}
                  placeholder="Необязательное поле"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="visibility">Видимость</Label>
                <Select value={visibility} onValueChange={(val) => setVisibility(val as Visibility)}>
                  <SelectTrigger id="visibility">
                    <SelectValue placeholder="Выберите видимость" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Публичный</SelectItem>
                    <SelectItem value="link_registered">По ссылке для авторизованных</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="vehicleTypeRequirement">Требования к машине</Label>
                <Select
                  value={vehicleType}
                  onValueChange={(val) => setVehicleType(val as VehicleTypeRequirement)}
                >
                  <SelectTrigger id="vehicleTypeRequirement">
                    <SelectValue placeholder="Требования" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Не важно</SelectItem>
                    <SelectItem value="sedan">Легковой</SelectItem>
                    <SelectItem value="crossover">Кроссовер</SelectItem>
                    <SelectItem value="suv">Внедорожник</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="locationText">Локация (текстом)</Label>
              <Input
                id="locationText"
                name="locationText"
                required
                className={
                  fieldError("locationText") ? "border-red-500 focus-visible:ring-red-500" : ""
                }
              />
              {fieldError("locationText") && (
                <p className="text-xs text-red-600">{fieldError("locationText")}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Описание ивента</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                className={
                  fieldError("description") ? "border-red-500 focus-visible:ring-red-500" : ""
                }
              />
              {fieldError("description") && (
                <p className="text-xs text-red-600">{fieldError("description")}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Тип участия</Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="radio"
                      name="paid"
                      checked={!isPaid}
                      onChange={() => setIsPaid(false)}
                    />
                    Бесплатное
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="radio"
                      name="paid"
                      checked={isPaid}
                      onChange={() => setIsPaid(true)}
                    />
                    Платное
                  </label>
                </div>
                {isPaid && (
                  <div className="mt-2 grid grid-cols-[1fr,120px] gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="price">Цена</Label>
                      <Input
                        id="price"
                        type="number"
                        min={0}
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="currency">Валюта</Label>
                      <Input
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        placeholder="KZT"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={isClubEvent}
                    onChange={(e) => setIsClubEvent(e.target.checked)}
                  />
                  Клубное событие
                </Label>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rules">Правила поведения в колонне и на маршруте (опционально)</Label>
              <Textarea
                id="rules"
                rows={4}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Порядок движения, частота рации, скорость, дистанция, запреты..."
              />
            </div>

            <div className="space-y-2">
              <Label>Допустимые марки авто (опционально)</Label>
              <div className="flex flex-wrap gap-2 text-sm">
                {brands.length === 0 ? (
                  <span className="text-muted-foreground">Нет справочника марок или загрузка...</span>
                ) : (
                  brands.map((brand) => (
                    <label
                      key={brand.id}
                      className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={allowedBrandIds.includes(brand.id)}
                        onChange={() => toggleBrand(brand.id)}
                      />
                      {brand.name}
                    </label>
                  ))
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2 border-t bg-background px-4 py-3">
            {errorMessage && <div className="mr-auto text-sm text-red-600">{errorMessage}</div>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Создаём..." : "Сохранить ивент"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">
            Кастомные поля регистрации
          </CardTitle>
          <CardDescription>
            Поля, которые участники заполняют при регистрации.
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
                    className={
                      fieldError(`customFieldsSchema.${index}.label`)
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                    onChange={(e) => {
                      updateField(field.id, { label: e.target.value });
                      if (fieldError(`customFieldsSchema.${index}.label`)) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next[`customFieldsSchema.${index}.label`];
                          return next;
                        });
                      }
                    }}
                  />
                {fieldError(`customFieldsSchema.${index}.label`) && (
                  <div className="text-xs text-red-600">
                    {fieldError(`customFieldsSchema.${index}.label`)}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Тип</Label>
                {FIELD_TYPE_OPTIONS.some((opt) => opt.value === field.type) ? (
                  <Select
                    value={field.type}
                    onValueChange={(value) =>
                      updateField(field.id, { type: value as EventCustomFieldType })
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
                ) : (
                  <Input value={field.type} disabled />
                )}
              </div>
              <div className="space-y-1">
                <Label>Обязательное</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={field.required}
                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  />
                  <span className="text-sm text-muted-foreground">Да</span>
                </div>
              </div>
              <div className="flex items-center justify-end md:col-span-4">
                <Button variant="ghost" size="sm" type="button" onClick={() => removeField(field.id)}>
                  Удалить поле
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" type="button" onClick={addField}>
            Добавить поле
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
