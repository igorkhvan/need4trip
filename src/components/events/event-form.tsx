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
import { Checkbox } from "@/components/ui/checkbox";
import { MultiBrandSelect, MultiBrandSelectOption } from "@/components/multi-brand-select";
import { Trash2 } from "lucide-react";
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
    const participantsCount = maxParticipants ?? null;
    const trimmedPrice = price.trim();
    const parsedPrice = trimmedPrice ? Number(trimmedPrice) : NaN;
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
    if (participantsCount === null || Number.isNaN(participantsCount)) {
      issues.maxParticipants = "Укажите количество участников от 1 до 15.";
    } else if (participantsCount < 1 || participantsCount > 15) {
      issues.maxParticipants = "Допустимый диапазон: 1–15.";
    }
    if (isPaid) {
      if (!trimmedPrice) {
        issues.price = "Укажите цену";
      } else if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        issues.price = "Цена должна быть больше 0";
      }
      if (!currency) {
        issues.currency = "Выберите валюту";
      }
    }
    if (!trimmedLocation) {
      issues.locationText = "Укажите локацию";
    }
    sortedFields.forEach((field, idx) => {
      if (!field.label.trim()) {
        issues[`customFieldsSchema.${idx}.label`] = "Введите название поля";
      }
    });
    return {
      issues,
      parsedDate,
      trimmedTitle,
      trimmedDescription,
      trimmedLocation,
      trimmedPrice,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      issues,
      parsedDate,
      trimmedTitle,
      trimmedDescription,
      trimmedLocation,
      trimmedPrice,
    } = validate();
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
      price: isPaid ? (trimmedPrice ? Number(trimmedPrice) : null) : null,
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

  const customFieldsLocked = Boolean(disableCustomFields);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-10 pt-12 md:px-6">
      <div className="space-y-4">
        <Button variant="ghost" className="inline-flex" asChild>
          <Link href={backHref} className="text-base font-medium text-[#111827]">
            ← Назад
          </Link>
        </Button>
        <div className="space-y-3">
          <h1 className="text-4xl font-black leading-tight text-[#0F172A] sm:text-5xl">
            {headerTitle}
          </h1>
          <p className="text-lg text-[#6B7280]">{headerDescription}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="border border-[#E5E7EB] p-5 shadow-sm md:p-6 lg:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-sm font-semibold text-white">
              1
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#0F172A]">Основные данные</p>
              <p className="text-xs text-[#6B7280]">Название, описание, дата, место, видимость</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-[#111827]">
                Название события
              </Label>
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
                placeholder="Например: зимний выезд в горы"
                className={
                  fieldErrors.title
                    ? "h-12 rounded-xl border-2 border-red-500 focus-visible:ring-red-500"
                    : "h-12 rounded-xl border-2"
                }
              />
              <div className="min-h-[28px] text-xs text-red-600">{fieldErrors.title ?? ""}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-[#111827]">
                Описание
              </Label>
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
                placeholder="Расскажите о маршруте, программе и особенностях поездки..."
                className={
                  fieldErrors.description
                    ? "rounded-xl border-2 border-red-500 focus-visible:ring-red-500"
                    : "rounded-xl border-2"
                }
              />
              <div className="min-h-[28px] text-xs text-red-600">{fieldErrors.description ?? ""}</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateTime" className="text-sm font-medium text-[#111827]">
                  Дата и время
                </Label>
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
              <div className="space-y-2">
                <Label htmlFor="locationText" className="text-sm font-medium text-[#111827]">
                  Место сбора
                </Label>
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
                  placeholder="Адрес или координаты"
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
              <div className="space-y-2">
                <Label htmlFor="maxParticipants" className="text-sm font-medium text-[#111827]">
                  Максимум участников
                </Label>
                <Input
                  id="maxParticipants"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  max={15}
                  value={maxParticipants ?? ""}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, "");
                    setMaxParticipants(digitsOnly ? Number(digitsOnly) : null);
                    if (fieldErrors.maxParticipants) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.maxParticipants;
                        return next;
                      });
                    }
                  }}
                  disabled={disabled}
                  placeholder="15"
                  className={
                    fieldErrors.maxParticipants
                      ? "h-12 rounded-xl border-2 border-red-500 focus-visible:ring-red-500"
                      : "h-12 rounded-xl border-2"
                  }
                />
                <div className="min-h-[28px] text-xs text-red-600">
                  {fieldErrors.maxParticipants ?? ""}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-[#111827]">
                  Категория события
                </Label>
                <Select
                  value={category ?? undefined}
                  onValueChange={(val) => setCategory(val as EventCategory)}
                  disabled={disabled}
                >
                  <SelectTrigger id="category" className="h-12 rounded-xl border-2">
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
                <div className="min-h-[28px]" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="visibility" className="text-sm font-medium text-[#111827]">
                  Видимость события
                </Label>
                <Select
                  value={visibility}
                  onValueChange={(val) => setVisibility(val as Visibility)}
                  disabled={disabled}
                >
                  <SelectTrigger id="visibility" className="h-12 rounded-xl border-2">
                    <SelectValue placeholder="Кто видит событие" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Публичный</SelectItem>
                    <SelectItem value="link_registered">По ссылке для авторизованных</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
                  <Checkbox
                    checked={isClubEvent}
                    onChange={(e) => setIsClubEvent(e.target.checked)}
                    disabled={disabled}
                  />
                  Клубное событие
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-[#111827]">Тип участия</Label>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                      !isPaid ? "border-[#FF6F2C]" : "border-[#E5E7EB] hover:border-[#6B7280]"
                    }`}
                  >
                    {!isPaid && <div className="h-2.5 w-2.5 rounded-full bg-[#FF6F2C]" />}
                  </div>
                  <input
                    type="radio"
                    name="paid"
                    checked={!isPaid}
                    onChange={() => setIsPaid(false)}
                    className="sr-only"
                    disabled={disabled}
                  />
                  Бесплатное
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                      isPaid ? "border-[#FF6F2C]" : "border-[#E5E7EB] hover:border-[#6B7280]"
                    }`}
                  >
                    {isPaid && <div className="h-2.5 w-2.5 rounded-full bg-[#FF6F2C]" />}
                  </div>
                  <input
                    type="radio"
                    name="paid"
                    checked={isPaid}
                    onChange={() => setIsPaid(true)}
                    className="sr-only"
                    disabled={disabled}
                  />
                  Платное
                </label>
              </div>
              {isPaid && (
                <div className="grid gap-3 md:grid-cols-[1fr,140px]">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-medium text-[#111827]">
                      Цена
                    </Label>
                    <Input
                      id="price"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min={0}
                      step={1}
                      value={price}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "");
                        setPrice(digitsOnly);
                        if (fieldErrors.price) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.price;
                            return next;
                          });
                        }
                      }}
                      disabled={disabled}
                      placeholder="5000"
                      className={
                        fieldErrors.price
                          ? "h-12 rounded-xl border-2 border-red-500 focus-visible:ring-red-500"
                          : "h-12 rounded-xl border-2"
                      }
                    />
                    <div className="min-h-[24px] text-xs text-red-600">{fieldErrors.price ?? ""}</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-sm font-medium text-[#111827]">
                      Валюта
                    </Label>
                    <Select
                      value={currency}
                      onValueChange={(val) => {
                        setCurrency(val);
                        if (fieldErrors.currency) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.currency;
                            return next;
                          });
                        }
                      }}
                      disabled={disabled}
                    >
                      <SelectTrigger id="currency" className="h-12 rounded-xl border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KZT">KZT</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="min-h-[24px] text-xs text-red-600">{fieldErrors.currency ?? ""}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="border border-[#E5E7EB] p-5 shadow-sm md:p-6 lg:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-sm font-semibold text-white">
              2
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#0F172A]">Требования к автомобилю</p>
              <p className="text-xs text-[#6B7280]">Тип авто и допустимые марки</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleTypeRequirement" className="text-sm font-medium text-[#111827]">
                Тип автомобиля
              </Label>
              <Select
                value={vehicleType}
                onValueChange={(val) => setVehicleType(val as VehicleTypeRequirement)}
                disabled={disabled}
              >
                <SelectTrigger id="vehicleTypeRequirement" className="h-12 rounded-xl border-2">
                  <SelectValue placeholder="Выберите тип автомобиля" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Любой</SelectItem>
                  <SelectItem value="sedan">Легковой</SelectItem>
                  <SelectItem value="crossover">Кроссовер</SelectItem>
                  <SelectItem value="suv">Внедорожник</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <MultiBrandSelect
                label="Допустимые марки авто (опционально)"
                placeholder="Поиск марки..."
                options={brands}
                value={allowedBrandIds}
                onChange={setAllowedBrandIds}
                error={fieldError("allowedBrandIds")}
                disabled={disabled}
              />
              <p className="text-sm text-[#6B7280]">
                Если не выбрано ни одной марки, участвовать могут любые автомобили.
              </p>
            </div>
          </div>
        </Card>

        <Card className="border border-[#E5E7EB] p-5 shadow-sm md:p-6 lg:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-sm font-semibold text-white">
              3
            </div>
            <div>
              <p className="text-2xl font-semibold text-[#0F172A]">Правила участия</p>
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
        </Card>

        <Card className="border border-[#E5E7EB] p-5 shadow-sm md:p-6 lg:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-sm font-semibold text-white">
              4
            </div>
            <div className="flex flex-1 items-center gap-3">
              <div>
                <p className="text-2xl font-semibold text-[#0F172A]">Дополнительные поля регистрации</p>
                <p className="text-xs text-[#6B7280]">Поля, которые заполняют участники</p>
              </div>
              {customFieldsLocked && (
                <span className="flex items-center gap-2 rounded-full bg-[#FFF4EF] px-3 py-1 text-[12px] font-semibold text-[#E86223]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M17 11H7a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1Zm-8-3a3 3 0 0 1 6 0v3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Заблокировано
                </span>
              )}
            </div>
          </div>

          <div className={customFieldsLocked ? "mt-4 space-y-4 opacity-70" : "mt-4 space-y-4"}>
            {sortedFields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F7F7F8] px-4 py-6 text-center text-sm text-[#6B7280]">
                {customFieldsLocked ? "Кастомные поля недоступны для редактирования" : "Добавьте первое поле регистрации"}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedFields.map((field, index) => {
                  const errorText = fieldError(`customFieldsSchema.${index}.label`);
                  return (
                    <div key={field.id} className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] p-4">
                      <div className="flex flex-col gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#111827]">Название поля</Label>
                            <Input
                              value={field.label}
                              placeholder="Например: Наличие рации"
                              className={
                                errorText
                                  ? "h-11 rounded-xl border-2 border-red-500 focus-visible:ring-red-500"
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
                              disabled={disabled || customFieldsLocked}
                            />
                            <div className="min-h-[28px] text-xs text-red-600">{errorText ?? ""}</div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#111827]">Тип</Label>
                            <Select
                              value={
                                FIELD_TYPE_OPTIONS.some((opt) => opt.value === field.type) ? field.type : "text"
                              }
                              onValueChange={(value) => updateField(field.id, { type: value as EventCustomFieldType })}
                              disabled={disabled || customFieldsLocked}
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
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-sm text-[#374151]">
                            <Checkbox
                              checked={field.required}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                              disabled={disabled || customFieldsLocked}
                            />
                            Обязательное
                          </label>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => removeField(field.id)}
                            disabled={disabled || customFieldsLocked}
                            className="h-9 w-9 rounded-full text-[#6B7280] hover:bg-[#FFF4EF] hover:text-[#E86223]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              type="button"
              onClick={addField}
              disabled={disabled || customFieldsLocked}
              className="h-11 rounded-xl px-4 text-[#0F172A]"
            >
              Добавить поле
            </Button>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3 bg-transparent px-2 pt-2">
          <div className="mr-auto min-h-[20px] text-sm text-red-600">{errorMessage ?? ""}</div>
          <Button
            variant="ghost"
            type="button"
            asChild
            className="rounded-xl px-4 text-[#0F172A]"
          >
            <Link href={backHref}>Отмена</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || disabled} className="rounded-xl px-5">
            {isSubmitting ? "Сохраняем..." : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
