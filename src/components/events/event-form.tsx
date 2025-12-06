"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { MultiBrandSelect, MultiBrandSelectOption } from "@/components/multi-brand-select";
import {
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

type Mode = "create" | "edit";

export type EventFormValues = {
  title: string;
  description: string;
  category: EventCategory | null;
  dateTime: string;
  locationText: string;
  maxParticipants: number | null;
  customFieldsSchema: EventCustomFieldSchema[];
  visibility: Visibility;
  vehicleTypeRequirement: VehicleTypeRequirement;
  allowedBrandIds: string[];
  rules: string;
  isClubEvent: boolean;
  isPaid: boolean;
  price: string;
  currency: string;
};

export type EventFormProps = {
  mode: Mode;
  initialValues?: Partial<EventFormValues>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  backHref: string;
  submitLabel: string;
  disableCustomFields?: boolean;
  disabled?: boolean;
  headerTitle: string;
  headerDescription: string;
};

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

export function EventForm({
  initialValues,
  onSubmit,
  backHref,
  submitLabel,
  disableCustomFields,
  disabled,
  headerTitle,
  headerDescription,
}: EventFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [category, setCategory] = useState<EventCategory | null>(initialValues?.category ?? null);
  const [dateTime, setDateTime] = useState(() => {
    if (initialValues?.dateTime) return initialValues.dateTime.slice(0, 16);
    return "";
  });
  const [locationText, setLocationText] = useState(initialValues?.locationText ?? "");
  const [maxParticipants, setMaxParticipants] = useState<number | null>(
    initialValues?.maxParticipants ?? null
  );
  const [customFields, setCustomFields] = useState<EventCustomFieldSchema[]>(
    initialValues?.customFieldsSchema ?? []
  );
  const [visibility, setVisibility] = useState<Visibility>(
    initialValues?.visibility ?? "public"
  );
  const [vehicleType, setVehicleType] = useState<VehicleTypeRequirement>(
    initialValues?.vehicleTypeRequirement ?? "any"
  );
  const [allowedBrandIds, setAllowedBrandIds] = useState<string[]>(
    initialValues?.allowedBrandIds ?? []
  );
  const [brands, setBrands] = useState<MultiBrandSelectOption[]>([]);
  const [rules, setRules] = useState<string>(initialValues?.rules ?? "");
  const [isClubEvent, setIsClubEvent] = useState<boolean>(initialValues?.isClubEvent ?? false);
  const [isPaid, setIsPaid] = useState<boolean>(initialValues?.isPaid ?? false);
  const [price, setPrice] = useState<string>(initialValues?.price ?? "");
  const [currency, setCurrency] = useState<string>(initialValues?.currency ?? "KZT");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedFields = useMemo(
    () => [...customFields].sort((a, b) => a.order - b.order),
    [customFields]
  );

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

  const addField = () => {
    setCustomFields((prev) => [...prev, buildEmptyField(prev.length + 1)]);
  };

  const updateField = (id: string, patch: Partial<EventCustomFieldSchema>) => {
    setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  const fieldError = (path: string) => fieldErrors[path];

  const validate = () => {
    const issues: Record<string, string> = {};
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = locationText.trim();
    const parsedDate = dateTime ? new Date(dateTime) : null;
    if (trimmedTitle.length < 3) {
      issues.title = "Название должно быть от 3 символов.";
    }
    if (trimmedDescription.length < 1) {
      issues.description = "Описание не может быть пустым.";
    }
    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      issues.dateTime = "Укажите корректную дату и время";
    } else if (parsedDate <= new Date()) {
      issues.dateTime = "Дата должна быть в будущем";
    }
    if (!trimmedLocation) {
      issues.locationText = "Укажите локацию";
    }
    sortedFields.forEach((field, idx) => {
      if (!field.label.trim()) {
        issues[`customFieldsSchema.${idx}.label`] = "Введите название поля";
      }
    });
    return { issues, parsedDate, trimmedTitle, trimmedDescription, trimmedLocation };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { issues, parsedDate, trimmedTitle, trimmedDescription, trimmedLocation } = validate();
    if (Object.keys(issues).length) {
      setFieldErrors(issues);
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    const payload = {
      title: trimmedTitle,
      description: trimmedDescription,
      category,
      dateTime: parsedDate ? parsedDate.toISOString() : new Date().toISOString(),
      locationText: trimmedLocation,
      maxParticipants,
      ...(disableCustomFields ? {} : { customFieldsSchema: sortedFields }),
      visibility,
      vehicleTypeRequirement: vehicleType,
      allowedBrandIds,
      rules: rules.trim() || null,
      isClubEvent,
      isPaid,
      price: isPaid ? (price ? Number(price) : null) : null,
      currency: isPaid ? currency || null : null,
    };

    try {
      await onSubmit(payload);
      router.push(backHref);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Не удалось сохранить ивент. Попробуйте ещё раз.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 md:px-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#E86223]">Ивент</p>
        <h1 className="text-3xl font-bold tracking-tight text-[#111827]">{headerTitle}</h1>
        <p className="text-sm text-[#6B7280]">{headerDescription}</p>
        <Button variant="ghost" size="sm" asChild className="text-[#6B7280] hover:text-[#111827]">
          <Link href={backHref}>← Назад</Link>
        </Button>
      </div>

      <Card className="p-4 shadow-sm md:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Секция 1: основные данные */}
          <div className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-sm font-semibold text-white">
                1
              </div>
              <div>
                <p className="text-base font-semibold text-[#111827]">Основные данные</p>
                <p className="text-xs text-[#6B7280]">Название, описание, дата, место, видимость</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.title;
                        return next;
                      });
                    }
                  }}
                  disabled={disabled}
                  placeholder="Название события"
                  className={
                    fieldErrors.title
                      ? "h-12 rounded-xl border-2 border-red-500 focus-visible:ring-red-500"
                      : "h-12 rounded-xl border-2"
                  }
                />
                <div className="min-h-[28px] text-xs text-red-600">{fieldErrors.title ?? ""}</div>
              </div>

              <div>
                <Textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (fieldErrors.description) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.description;
                        return next;
                      });
                    }
                  }}
                  disabled={disabled}
                  placeholder="Расскажите о маршруте, программе и особенностях"
                  className={
                    fieldErrors.description
                      ? "rounded-xl border-2 border-red-500 focus-visible:ring-red-500"
                      : "rounded-xl border-2"
                  }
                />
                <div className="min-h-[28px] text-xs text-red-600">{fieldErrors.description ?? ""}</div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Input
                    id="dateTime"
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    disabled={disabled}
                    className={
                      fieldErrors.dateTime
                        ? "h-12 rounded-xl border-2 border-red-500 focus-visible:ring-red-500"
                        : "h-12 rounded-xl border-2"
                    }
                  />
                  <div className="min-h-[28px] text-xs text-red-600">{fieldErrors.dateTime ?? ""}</div>
                </div>
                <div>
                  <Input
                    id="locationText"
                    value={locationText}
                    onChange={(e) => {
                      setLocationText(e.target.value);
                      if (fieldErrors.locationText) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.locationText;
                          return next;
                        });
                      }
                    }}
                    disabled={disabled}
                    placeholder="Место сбора"
                    className={
                      fieldErrors.locationText
                        ? "h-12 rounded-xl border-2 border-red-500 focus-visible:ring-red-500"
                        : "h-12 rounded-xl border-2"
                    }
                  />
                  <div className="min-h-[28px] text-xs text-red-600">
                    {fieldErrors.locationText ?? ""}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min={1}
                    value={maxParticipants ?? ""}
                    onChange={(e) => setMaxParticipants(e.target.value ? Number(e.target.value) : null)}
                    disabled={disabled}
                    placeholder="Максимум экипажей"
                    className="h-12 rounded-xl border-2"
                  />
                  <div className="min-h-[28px]" />
                </div>
                <div>
                  <Select
                    value={category ?? undefined}
                    onValueChange={(val) => setCategory(val as EventCategory)}
                    disabled={disabled}
                  >
                    <SelectTrigger id="category" className="h-12 rounded-xl border-2">
                      <SelectValue placeholder="Категория события" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="min-h-[28px]" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  value={visibility}
                  onValueChange={(val) => setVisibility(val as Visibility)}
                  disabled={disabled}
                >
                  <SelectTrigger id="visibility" className="h-12 rounded-xl border-2">
                    <SelectValue placeholder="Видимость события" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Публичный</SelectItem>
                    <SelectItem value="link_registered">По ссылке для авторизованных</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#374151]">
                    <div
                      className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        isClubEvent ? "bg-[#FF6F2C] border-[#FF6F2C]" : "border-[#E5E7EB] hover:border-[#6B7280]"
                      }`}
                    >
                      {isClubEvent && (
                        <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={isClubEvent}
                      onChange={(e) => setIsClubEvent(e.target.checked)}
                      className="sr-only"
                      disabled={disabled}
                    />
                    Клубное событие
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-[#111827]">Тип участия</p>
                <div className="flex flex-wrap items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#374151]">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        !isPaid ? "border-[#FF6F2C]" : "border-[#E5E7EB] hover:border-[#6B7280]"
                      }`}
                    >
                      {!isPaid && <div className="h-2.5 w-2.5 rounded-full bg-[#FF6F2C]" />}
                    </div>
                    <input type="radio" name="paid" checked={!isPaid} onChange={() => setIsPaid(false)} className="sr-only" disabled={disabled} />
                    Бесплатное
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#374151]">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isPaid ? "border-[#FF6F2C]" : "border-[#E5E7EB] hover:border-[#6B7280]"
                      }`}
                    >
                      {isPaid && <div className="h-2.5 w-2.5 rounded-full bg-[#FF6F2C]" />}
                    </div>
                    <input type="radio" name="paid" checked={isPaid} onChange={() => setIsPaid(true)} className="sr-only" disabled={disabled} />
                    Платное
                  </label>
                </div>
                {isPaid && (
                  <div className="grid gap-3 md:grid-cols-[1fr,140px]">
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      step={0.01}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={disabled}
                      placeholder="Цена"
                      className="h-12 rounded-xl border-2"
                    />
                    <Input
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      placeholder="Валюта"
                      disabled={disabled}
                      className="h-12 rounded-xl border-2"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Секция 2: авто */}
          <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-sm font-semibold text-white">
                2
              </div>
              <div>
                <p className="text-base font-semibold text-[#111827]">Требования к автомобилю</p>
                <p className="text-xs text-[#6B7280]">Тип авто и допустимые марки</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                value={vehicleType}
                onValueChange={(val) => setVehicleType(val as VehicleTypeRequirement)}
                disabled={disabled}
              >
                <SelectTrigger id="vehicleTypeRequirement" className="h-12 rounded-xl border-2">
                  <SelectValue placeholder="Тип автомобиля" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Не важно</SelectItem>
                  <SelectItem value="sedan">Легковой</SelectItem>
                  <SelectItem value="crossover">Кроссовер</SelectItem>
                  <SelectItem value="suv">Внедорожник</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <MultiBrandSelect
                  label="Допустимые марки авто (опционально)"
                  placeholder="Выберите марку..."
                  options={brands}
                  value={allowedBrandIds}
                  onChange={setAllowedBrandIds}
                  error={fieldError("allowedBrandIds")}
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  Если не выбрано ни одной марки, участвовать могут любые автомобили.
                </p>
              </div>
            </div>
          </div>

          {/* Секция 3: правила */}
          <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-sm font-semibold text-white">
                3
              </div>
              <div>
                <p className="text-base font-semibold text-[#111827]">Правила участия</p>
                <p className="text-xs text-[#6B7280]">Показываются в карточке события</p>
              </div>
            </div>
            <Textarea
              id="rules"
              rows={4}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Опишите условия: порядок движения, скорость, рация, запреты..."
              disabled={disabled}
              className="rounded-xl border-2"
            />
          </div>

          {/* Секция 4: кастомные поля */}
          {!disableCustomFields && (
            <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-sm font-semibold text-white">
                  4
                </div>
                <div>
                  <p className="text-base font-semibold text-[#111827]">Кастомные поля регистрации</p>
                  <p className="text-xs text-[#6B7280]">Поля, которые заполняют участники</p>
                </div>
              </div>
              {sortedFields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white px-4 py-6 text-center text-sm text-[#6B7280]">
                  Добавьте первое поле регистрации
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedFields.map((field, index) => {
                    const errorText = fieldError(`customFieldsSchema.${index}.label`);
                    return (
                      <div key={field.id} className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1 md:col-span-2">
                            <Label className="text-sm font-medium text-[#111827]">Название поля</Label>
                            <Input
                              value={field.label}
                              placeholder="Например: Наличие рации"
                              className={
                                errorText
                                  ? "border-red-500 focus-visible:ring-red-500 h-11 rounded-xl border-2"
                                  : "h-11 rounded-xl border-2"
                              }
                              onChange={(e) => {
                                updateField(field.id, { label: e.target.value });
                                if (errorText) {
                                  setFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[`customFieldsSchema.${index}.label`];
                                    return next;
                                  });
                                }
                              }}
                              disabled={disabled}
                            />
                            <div className="min-h-[28px] text-xs text-red-600">{errorText ?? ""}</div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm font-medium text-[#111827]">Тип</Label>
                            <Select
                              value={FIELD_TYPE_OPTIONS.some((opt) => opt.value === field.type) ? field.type : "text"}
                              onValueChange={(value) => updateField(field.id, { type: value as EventCustomFieldType })}
                              disabled={disabled}
                            >
                              <SelectTrigger className="h-11 rounded-xl border-2">
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
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-2 border-[#E5E7EB] text-[#E86223] focus-visible:ring-2 focus-visible:ring-[#FF6F2C33]"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                              disabled={disabled}
                            />
                            <span className="text-sm text-[#374151]">Обязательное</span>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => removeField(field.id)}
                            disabled={disabled}
                            className="text-[#6B7280] hover:text-[#EF4444]"
                          >
                            Удалить
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button
                variant="outline"
                type="button"
                onClick={addField}
                disabled={disabled}
                className="h-11 rounded-xl px-4"
              >
                Добавить поле
              </Button>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-[#E5E7EB] bg-background px-2 pt-4">
            <div className="mr-auto min-h-[20px] text-sm text-red-600">{errorMessage ?? ""}</div>
            <Button type="submit" disabled={isSubmitting || disabled} className="rounded-xl px-5">
              {isSubmitting ? "Сохраняем..." : submitLabel}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
