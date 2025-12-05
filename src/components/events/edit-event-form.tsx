"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import {
  CarBrand,
  EventCategory,
  EventCustomFieldSchema,
  EventCustomFieldType,
  VehicleTypeRequirement,
  Visibility,
} from "@/lib/types/event";
import { MultiBrandSelect, MultiBrandSelectOption } from "@/components/multi-brand-select";

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
    visibility: Visibility;
    vehicleTypeRequirement: VehicleTypeRequirement;
    allowedBrands: CarBrand[];
    rules?: string | null;
    isClubEvent: boolean;
    isPaid: boolean;
    price?: number | null;
    currency?: string | null;
  };
  hasParticipants: boolean;
  isOwner: boolean;
  authMissing: boolean;
  formattedDateTime: string;
}

export function EditEventForm({
  event,
  hasParticipants,
  isOwner,
  authMissing,
  formattedDateTime,
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
  const [visibility, setVisibility] = useState<Visibility>(event.visibility ?? "public");
  const [vehicleType, setVehicleType] = useState<VehicleTypeRequirement>(
    event.vehicleTypeRequirement ?? "any"
  );
  const [allowedBrandIds, setAllowedBrandIds] = useState<string[]>(
    (event.allowedBrands ?? []).map((b) => b.id)
  );
  const [brands, setBrands] = useState<MultiBrandSelectOption[]>([]);
  const [rules, setRules] = useState<string>(event.rules ?? "");
  const [isClubEvent, setIsClubEvent] = useState<boolean>(event.isClubEvent ?? false);
  const [isPaid, setIsPaid] = useState<boolean>(event.isPaid ?? false);
  const [price, setPrice] = useState<string>(event.price ? String(event.price) : "");
  const [currency, setCurrency] = useState<string>(event.currency ?? "KZT");
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

  useEffect(() => {
    const loadBrands = async () => {
      try {
        const res = await fetch("/api/car-brands");
        if (!res.ok) return;
        const data = (await res.json()) as {
          brands?: { id: string; name: string; slug?: string | null }[];
        };
        setBrands(
          (data.brands ?? []).map((brand) => ({
            id: brand.id,
            name: brand.name,
          }))
        );
      } catch (err) {
        console.error("Failed to load car brands", err);
      }
    };
    loadBrands();
  }, []);

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
        visibility,
        vehicleTypeRequirement: vehicleType,
        allowedBrandIds,
        rules: rules.trim() || null,
        isClubEvent,
        isPaid,
        price: isPaid ? (price ? Number(price) : null) : null,
        currency: isPaid ? currency || null : null,
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
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Ивент</p>
        <h1 className="text-3xl font-bold tracking-tight">Редактирование: {event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formattedDateTime} •{" "}
          {category
            ? CATEGORY_OPTIONS.find((c) => c.value === category)?.label
            : "Выезд на выходные"}
        </p>
        <p className="text-sm text-muted-foreground">
          Обновите ключевые параметры ивента. Изменения сразу будут видны участникам.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/events/${event.id}`}>← Назад к событию</Link>
          </Button>
        </div>
      </div>

      {authMissing && (
        <Alert>
          <AlertTitle>Требуется авторизация</AlertTitle>
          <AlertDescription>Войдите через Telegram, чтобы редактировать ивент.</AlertDescription>
        </Alert>
      )}
      {!isOwner && (
        <Alert variant="destructive">
          <AlertTitle>Нет прав</AlertTitle>
          <AlertDescription>Только владелец может редактировать этот ивент.</AlertDescription>
        </Alert>
      )}

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              Основные данные
            </CardTitle>
            <CardDescription>
              Обновите название, дату, лимиты и описание ивента.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="title">Название</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={authMissing || !isOwner}
                />
              </div>
              <div className="space-y-1">
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
              <div className="space-y-1">
                <Label htmlFor="dateTime">Дата и время</Label>
                <Input
                  id="dateTime"
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  disabled={authMissing || !isOwner}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="maxParticipants">Максимум экипажей</Label>
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
              <div className="space-y-1">
                <Label htmlFor="visibility">Видимость</Label>
                <Select
                  value={visibility}
                  disabled={authMissing || !isOwner}
                  onValueChange={(val) => setVisibility(val as Visibility)}
                >
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
                  disabled={authMissing || !isOwner}
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
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                disabled={authMissing || !isOwner}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Описание ивента</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={authMissing || !isOwner}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Тип участия</Label>
                <p className="text-xs text-muted-foreground">
                  Эта информация показывается в карточке события и при регистрации.
                </p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="radio"
                      name="paid"
                      checked={!isPaid}
                      onChange={() => setIsPaid(false)}
                      disabled={authMissing || !isOwner}
                    />
                    Бесплатное
                  </label>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="radio"
                      name="paid"
                      checked={isPaid}
                      onChange={() => setIsPaid(true)}
                      disabled={authMissing || !isOwner}
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
                        disabled={authMissing || !isOwner}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="currency">Валюта</Label>
                      <Input
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        placeholder="KZT"
                        disabled={authMissing || !isOwner}
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
                    disabled={authMissing || !isOwner}
                  />
                  Клубное событие
                </Label>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rules">Правила поведения в колонне и на маршруте (опционально)</Label>
              <p className="text-xs text-muted-foreground">
                Кратко опишите порядок движения, связь по рации и ключевые ограничения.
              </p>
              <Textarea
                id="rules"
                rows={4}
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Порядок движения, частота рации, скорость, дистанция, запреты..."
                disabled={authMissing || !isOwner}
              />
            </div>

            <div className="space-y-2">
              <MultiBrandSelect
                label="Допустимые марки авто (опционально)"
                placeholder="Выберите марку..."
                options={brands}
                value={allowedBrandIds}
                onChange={setAllowedBrandIds}
                disabled={authMissing || !isOwner}
              />
              <p className="text-xs text-muted-foreground">
                Если не выбрано ни одной марки, участвовать могут любые автомобили.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2 border-t bg-background px-4 py-3">
            {errorMessage && <div className="mr-auto text-sm text-red-600">{errorMessage}</div>}
            <Button variant="ghost" type="button" asChild disabled={isSubmitting}>
              <Link href={`/events/${event.id}`}>Отменить</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting || authMissing || !isOwner}>
              {isSubmitting ? "Сохранение..." : "Сохранить"}
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
          {hasParticipants && (
            <Alert>
              <AlertTitle>Редактирование заблокировано</AlertTitle>
              <AlertDescription>
                Уже есть зарегистрированные участники, поэтому схему кастомных полей нельзя изменить.
              </AlertDescription>
            </Alert>
          )}

          {hasParticipants ? (
            <div className="space-y-3">
              {sortedFields.map((field) => (
                <div
                  key={field.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{field.label}</span>
                  <span className="text-muted-foreground">
                    · Тип: {FIELD_TYPE_OPTIONS.find((o) => o.value === field.type)?.label}
                  </span>
                  {field.required && (
                    <span className="text-xs uppercase tracking-wide text-red-500">
                      Обязательное
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">Порядок: {field.order}</span>
                </div>
              ))}
            </div>
          ) : (
            <>
              {sortedFields.map((field) => (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-lg border bg-background px-4 py-3 md:grid-cols-4 md:items-center"
                >
                  <div className="space-y-1 md:col-span-2">
                    <Label>Метка</Label>
                    <Input
                      value={field.label}
                      placeholder="Название поля"
                      disabled={authMissing || !isOwner}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Тип</Label>
                    {FIELD_TYPE_OPTIONS.some((opt) => opt.value === field.type) ? (
                      <Select
                        value={field.type}
                        disabled={authMissing || !isOwner}
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
                    ) : (
                      <Input value={field.type} disabled />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Порядок</Label>
                    <Input
                      type="number"
                      min={1}
                      value={field.order}
                      disabled={authMissing || !isOwner}
                      onChange={(e) => updateField(field.id, { order: Number(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Обязательное</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={field.required}
                        disabled={authMissing || !isOwner}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      />
                      <span className="text-sm text-muted-foreground">Да</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 md:col-span-4">
                    <Button
                      variant="ghost"
                      type="button"
                      disabled={authMissing || !isOwner}
                      onClick={() => removeField(field.id)}
                    >
                      Удалить поле
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                type="button"
                onClick={addField}
                disabled={authMissing || !isOwner}
              >
                Добавить поле
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
