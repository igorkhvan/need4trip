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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { CurrencySelect } from "@/components/ui/currency-select";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  EventCustomFieldSchema,
  EventCustomFieldType,
  VehicleTypeRequirement,
  Visibility,
} from "@/lib/types/event";
import { EventCategoryDto } from "@/lib/types/eventCategory";
import type { Club } from "@/lib/types/club";
import { getCategoryIcon } from "@/lib/utils/eventCategories";
import { getErrorMessage } from "@/lib/utils/errors";
import { useClubPlan } from "@/hooks/use-club-plan";
import { PaywallModal, usePaywall } from "@/components/billing/PaywallModal";

const FIELD_TYPE_OPTIONS: { value: EventCustomFieldType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "number", label: "Число" },
  { value: "boolean", label: "Да / Нет" },
];

type Mode = "create" | "edit";

export type EventFormValues = {
  title: string;
  description: string;
  categoryId: string | null; // FK to event_categories
  dateTime: string;
  cityId: string | null; // FK на cities
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
  currencyCode: string | null; // ISO 4217 code
};

export type EventFormProps = {
  mode: Mode;
  initialValues?: Partial<EventFormValues>;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  backHref: string;
  submitLabel: string;
  lockedFieldIds?: string[]; // ID полей, которые нельзя удалять (если есть участники)
  disabled?: boolean;
  headerTitle: string;
  headerDescription: string;
  club?: Club | null; // Клуб, если событие создается от клуба
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
  mode,
  initialValues,
  onSubmit,
  backHref,
  submitLabel,
  lockedFieldIds = [],
  disabled,
  headerTitle,
  headerDescription,
  club,
}: EventFormProps) {
  const router = useRouter();
  
  // ⚡ Billing v2.0: Load club plan limits dynamically
  const { plan, limits: clubLimits, loading: loadingPlan } = useClubPlan(club?.id);
  const { showPaywall, PaywallModalComponent } = usePaywall();
  
  // Determine max participants based on club plan (default to 15 for Free)
  const maxAllowedParticipants = clubLimits?.maxEventParticipants ?? 15;
  
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(initialValues?.categoryId ?? null);
  const [categories, setCategories] = useState<EventCategoryDto[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [dateTime, setDateTime] = useState(() => {
    if (initialValues?.dateTime) return initialValues.dateTime.slice(0, 16);
    return "";
  });
  const [cityId, setCityId] = useState<string | null>(initialValues?.cityId ?? null);
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
  const [vehicleTypes, setVehicleTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [rules, setRules] = useState<string>(initialValues?.rules ?? "");
  const [isClubEvent, setIsClubEvent] = useState<boolean>(initialValues?.isClubEvent ?? false);
  const [isPaid, setIsPaid] = useState<boolean>(initialValues?.isPaid ?? false);
  const [price, setPrice] = useState<string>(initialValues?.price ?? "");
  const [currencyCode, setCurrencyCode] = useState<string | null>(initialValues?.currencyCode ?? null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingRules, setIsGeneratingRules] = useState(false);
  const [showAiConfirmDialog, setShowAiConfirmDialog] = useState(false);

  const sortedFields = useMemo(
    () => [...customFields].sort((a, b) => a.order - b.order),
    [customFields]
  );

  // Track if user has interacted with maxParticipants field
  const [hasUserSetMaxParticipants, setHasUserSetMaxParticipants] = useState(false);
  
  // Auto-fill maxParticipants with plan limit for new events (only once, on initial load)
  useEffect(() => {
    if (mode === 'create' && maxParticipants === null && clubLimits && !loadingPlan && !hasUserSetMaxParticipants) {
      // Set default maxParticipants to plan limit
      if (clubLimits.maxEventParticipants !== null && clubLimits.maxEventParticipants > 0) {
        setMaxParticipants(clubLimits.maxEventParticipants);
      }
    }
  }, [mode, maxParticipants, clubLimits, loadingPlan, hasUserSetMaxParticipants]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [brandsRes, typesRes] = await Promise.all([
          fetch("/api/car-brands"),
          fetch("/api/vehicle-types"),
        ]);
        
        if (brandsRes.ok) {
          const brandsData = (await brandsRes.json()) as {
            brands?: { id: string; name: string; slug?: string | null }[];
          };
          setBrands(
            (brandsData.brands ?? []).map((brand) => ({
              id: brand.id,
              name: brand.name,
            }))
          );
        }
        
        if (typesRes.ok) {
          const typesData = await typesRes.json();
          // API returns: {success: true, data: {vehicleTypes: [...]}}
          const types = typesData.data?.vehicleTypes || typesData.vehicleTypes || [];
          setVehicleTypes(types);
        }
      } catch (err) {
        console.error("Failed to load car data", err);
      }
    };
    loadData();
  }, []);

  // Load categories from API
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/event-categories");
        if (res.ok) {
          const response = await res.json();
          const data = response.data || response;
          const loadedCategories = data.categories || [];
          setCategories(loadedCategories);
          
          // Set default category from DB (marked with is_default=true)
          // Only for new events (not editing)
          if (!initialValues?.categoryId && loadedCategories.length > 0) {
            const defaultCategory = loadedCategories.find((cat: EventCategoryDto) => cat.isDefault === true);
            if (defaultCategory) {
              setCategoryId(defaultCategory.id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, []); // Empty deps - run only once on mount

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
      const limitText = maxAllowedParticipants === null ? "" : ` до ${maxAllowedParticipants}`;
      issues.maxParticipants = `Укажите количество участников от 1${limitText}.`;
    } else if (participantsCount < 1) {
      issues.maxParticipants = "Минимум 1 участник.";
    }
    // Note: Max participant limit is checked on backend and returns PaywallError (402)
    if (isPaid) {
      if (!trimmedPrice) {
        issues.price = "Укажите цену";
      } else if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        issues.price = "Цена должна быть больше 0";
      }
      if (!currencyCode) {
        issues.currencyCode = "Выберите валюту";
      }
    }
    if (!trimmedLocation) {
      issues.locationText = "Укажите локацию";
    }
    if (!cityId) {
      issues.cityId = "Выберите город";
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

  const handleAiButtonClick = () => {
    // Validate required fields first
    if (!title.trim() || !categoryId || !cityId) {
      if (!title.trim()) {
        setFieldErrors(prev => ({ ...prev, title: "Укажите название события" }));
      }
      if (!categoryId) {
        setFieldErrors(prev => ({ ...prev, categoryId: "Выберите категорию" }));
      }
      if (!cityId) {
        setFieldErrors(prev => ({ ...prev, cityId: "Выберите город" }));
      }
      return;
    }
    
    // Show confirmation dialog
    setShowAiConfirmDialog(true);
  };

  const handleGenerateRules = async () => {
    // Prevent if already generating
    if (isGeneratingRules) {
      return;
    }

    setIsGeneratingRules(true);
    setErrorMessage(null);

    try {
      // Build payload for AI (same structure as save payload)
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        categoryId,
        dateTime: dateTime ? new Date(dateTime).toISOString() : new Date().toISOString(),
        cityId,
        locationText: locationText.trim(),
        maxParticipants,
        customFieldsSchema: sortedFields,
        visibility,
        vehicleTypeRequirement: vehicleType,
        allowedBrandIds,
        isClubEvent,
        isPaid,
        price: isPaid && price ? Number(price) : null,
        currencyCode: isPaid ? currencyCode : null,
        rules: rules.trim() || null,
      };

      const response = await fetch("/api/ai/events/generate-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.message || "Не удалось сгенерировать правила";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const result = data.data || data;

      if (result.rulesText) {
        setRules(result.rulesText);
        // Show success feedback
        const event = new CustomEvent("toast", {
          detail: {
            title: "Готово!",
            description: "Правила успешно сгенерированы. Вы можете отредактировать их перед сохранением.",
          },
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Произошла ошибка при генерации правил";
      setErrorMessage(message);
      
      // Show error toast
      const event = new CustomEvent("toast", {
        detail: {
          title: "Ошибка",
          description: message,
          variant: "destructive",
        },
      });
      window.dispatchEvent(event);
    } finally {
      setIsGeneratingRules(false);
    }
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
      categoryId,
      dateTime: parsedDate ? parsedDate.toISOString() : new Date().toISOString(),
      cityId: cityId || null, // FK на cities
      locationText: trimmedLocation,
      maxParticipants,
      customFieldsSchema: sortedFields,
      visibility,
      vehicleTypeRequirement: vehicleType,
      allowedBrandIds,
      rules: rules.trim() || null,
      isClubEvent,
      isPaid,
      price: isPaid ? (trimmedPrice ? Number(trimmedPrice) : null) : null,
      currencyCode: isPaid ? currencyCode || null : null,
    };

    try {
      await onSubmit(payload);
      router.push(backHref);
      router.refresh();
    } catch (err: any) {
      // Check if this is a paywall error that's already been handled
      if (err?.isPaywall || err?.message === 'PAYWALL_SHOWN') {
        // Paywall modal is already shown, don't show error message
        return;
      }
      
      // ⚡ Billing v2.0: Handle paywall errors (402)
      if (err && typeof err === 'object' && 'message' in err) {
        const errorMsg = String(err.message || '');
        // Check if this is a fetch response error with paywall details
        try {
          // Try to parse error as API response
          const match = errorMsg.match(/\{[\s\S]*\}/);
          if (match) {
            const apiError = JSON.parse(match[0]);
            if (apiError.error?.details?.code === 'PAYWALL') {
              showPaywall(apiError.error.details);
              return;
            }
          }
        } catch {
          // Not a JSON error, continue with default handling
        }
      }
      
      setErrorMessage(getErrorMessage(err, "Не удалось сохранить событие. Попробуйте ещё раз."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasLockedFields = lockedFieldIds.length > 0;

  // Debug logging
  useEffect(() => {
    // Locked fields are now silently prevented from deletion
  }, [hasLockedFields, lockedFieldIds, sortedFields]);

  return (
    <div className="page-container space-y-6 pb-10 pt-12">
      <div className="space-y-4">
        <ConfirmDialog
          trigger={
            <Button variant="ghost" className="w-fit">
              ← Назад
            </Button>
          }
          title="Вернуться назад?"
          description="Все несохранённые данные будут потеряны. Вы уверены, что хотите вернуться?"
          confirmText="Да, вернуться"
          cancelText="Продолжить редактирование"
          onConfirm={() => router.push(backHref)}
        />
        <div className="space-y-3">
          <h1 className="text-5xl font-bold leading-tight text-[#0F172A]">
            {headerTitle}
          </h1>
          <p className="text-base text-[#6B7280]">{headerDescription}</p>
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
                className={fieldErrors.title ? "border-red-500 focus:border-red-500" : ""}
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
                className={fieldErrors.description ? "border-red-500 focus:border-red-500" : ""}
              />
              <div className="min-h-[28px] text-xs text-red-600">{fieldErrors.description ?? ""}</div>
            </div>

            {/* Город */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#111827]">
                Город <span className="text-red-500">*</span>
              </Label>
              <CityAutocomplete
                value={cityId}
                onChange={(newCityId, city) => {
                  setCityId(newCityId);
                  // city object is available here if needed for future use
                  if (fieldErrors.cityId) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.cityId;
                      return next;
                    });
                  }
                }}
                disabled={disabled}
                placeholder="Выберите город..."
                error={!!fieldErrors.cityId}
                errorMessage={fieldErrors.cityId}
              />
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
                  className={fieldErrors.dateTime ? "border-red-500 focus:border-red-500" : ""}
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
                  }                  }
                  disabled={disabled}
                  placeholder="Адрес или координаты"
                  className={fieldErrors.locationText ? "border-red-500 focus:border-red-500" : ""}
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
                  {clubLimits && !loadingPlan && (
                    <span className="ml-2 text-xs font-normal text-[#6B7280]">
                      (ваш лимит: {maxAllowedParticipants === null ? '∞' : maxAllowedParticipants})
                    </span>
                  )}
                </Label>
                <Input
                  id="maxParticipants"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  max={maxAllowedParticipants === null ? undefined : maxAllowedParticipants}
                  value={maxParticipants ?? ""}
                  onChange={(e) => {
                    setHasUserSetMaxParticipants(true); // Mark as user-edited
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
                  disabled={disabled || loadingPlan}
                  placeholder={maxAllowedParticipants === null ? '∞' : String(maxAllowedParticipants)}
                  className={fieldErrors.maxParticipants ? "border-red-500 focus:border-red-500" : ""}
                />
                <div className="min-h-[28px] text-xs text-red-600">
                  {fieldErrors.maxParticipants ?? ""}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-[#111827]">
                  Категория события
                </Label>
                {/* Debug info - remove after testing */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500">
                    State: {categoryId || 'null'} | Categories loaded: {categories.length}
                  </div>
                )}
                {loadingCategories ? (
                  <div className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-gray-50 flex items-center justify-center text-[#6B7280]">
                    Загрузка категорий...
                  </div>
                ) : (
                  <Select
                    value={categoryId || ""}
                    onValueChange={(val) => {
                      // Ignore empty string changes (Radix UI bug)
                      if (val === "" && categoryId) {
                        return;
                      }
                      setCategoryId(val || null);
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nameRu}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
                  <SelectTrigger id="visibility">
                    <SelectValue placeholder="Кто видит событие" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Публичный (видно всем)</SelectItem>
                    <SelectItem value="unlisted">По прямой ссылке</SelectItem>
                    <SelectItem value="restricted">Только участникам/клубу</SelectItem>
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
                  {!club && (
                    <span className="ml-2 text-xs text-[#6B7280]">
                      (требуется активная подписка клуба)
                    </span>
                  )}
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
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
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
                        className={fieldErrors.price ? "border-red-500 focus:border-red-500" : ""}
                      />
                      <div className="min-h-[24px] text-xs text-red-600">{fieldErrors.price ?? ""}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#111827]">
                        Валюта
                      </Label>
                      <CurrencySelect
                        value={currencyCode}
                        onChange={(newCode) => {
                          setCurrencyCode(newCode);
                          if (fieldErrors.currencyCode) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.currencyCode;
                              return next;
                            });
                          }
                        }}
                        disabled={disabled}
                        placeholder="Выберите валюту..."
                        error={fieldErrors.currencyCode}
                      />
                    </div>
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
                Требование к типу авто
              </Label>
              <Select
                value={vehicleType}
                onValueChange={(val) => setVehicleType(val as VehicleTypeRequirement)}
                disabled={disabled}
              >
                <SelectTrigger id="vehicleTypeRequirement">
                  <SelectValue placeholder="Выберите требование" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Любой</SelectItem>
                  {vehicleTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
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
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-sm font-semibold text-white">
                3
              </div>
              <div>
                <p className="text-2xl font-semibold text-[#0F172A]">Правила участия</p>
                <p className="text-xs text-[#6B7280]">Показываются в карточке события</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAiButtonClick}
              disabled={disabled || isGeneratingRules || isSubmitting}
            >
              {isGeneratingRules ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Генерация...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Сгенерировать правила (ИИ)
                </>
              )}
            </Button>
          </div>
          <Textarea
            id="rules"
            rows={8}
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Опишите условия: порядок движения, скорость, рация, запреты... Или используйте кнопку 'Сгенерировать правила (ИИ)'"
            disabled={disabled}
            className={isGeneratingRules ? "opacity-50" : ""}
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
              {hasLockedFields && (
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
                  Частично заблокировано
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {sortedFields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F7F7F8] px-4 py-6 text-center text-sm text-[#6B7280]">
                Добавьте первое поле регистрации
              </div>
            ) : (
              <div className="space-y-4">
                {sortedFields.map((field, index) => {
                  const errorText = fieldError(`customFieldsSchema.${index}.label`);
                  const isLocked = lockedFieldIds.includes(field.id);
                  return (
                    <div 
                      key={field.id} 
                      className={`rounded-xl border p-4 ${
                        isLocked ? "border-[#FFF4EF] bg-[#FFFBF8]" : "border-[#E5E7EB] bg-[#F7F7F8]"
                      }`}
                    >
                      <div className="flex flex-col gap-4">
                        {isLocked && (
                          <div className="mb-2 flex items-center gap-2 text-xs text-[#E86223]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            Используется участниками — удаление запрещено
                          </div>
                        )}
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#111827]">Название поля</Label>
                            <Input
                              value={field.label}
                              placeholder="Например: Наличие рации"
                              className={errorText ? "border-red-500 focus:border-red-500" : ""}
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
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#111827]">Тип</Label>
                            <Select
                              value={
                                FIELD_TYPE_OPTIONS.some((opt) => opt.value === field.type) ? field.type : "text"
                              }
                              onValueChange={(value) => updateField(field.id, { type: value as EventCustomFieldType })}
                              disabled={disabled || isLocked}
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
                            {isLocked && (
                              <p className="text-xs text-[#6B7280]">Тип нельзя изменить</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-sm text-[#374151]">
                            <Checkbox
                              checked={field.required}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                              disabled={disabled}
                            />
                            Обязательное
                          </label>
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => removeField(field.id)}
                            disabled={disabled || isLocked}
                            className="h-9 w-9 rounded-full text-[#6B7280] hover:bg-[#FFF4EF] hover:text-[#E86223] disabled:cursor-not-allowed disabled:opacity-40"
                            title={isLocked ? "Поле используется участниками и не может быть удалено" : "Удалить поле"}
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
              variant="secondary"
              type="button"
              onClick={addField}
              disabled={disabled}
              className="h-11 px-4"
            >
              + Добавить поле
            </Button>
          </div>
          {hasLockedFields && (
            <p className="mt-2 text-xs text-[#6B7280]">
              Вы можете добавлять новые поля, но не можете удалять существующие, так как они используются участниками.
            </p>
          )}
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3 bg-transparent px-2 pt-2">
          <div className="mr-auto min-h-[20px] text-sm text-red-600">{errorMessage ?? ""}</div>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" type="button" className="px-4">
                Отмена
              </Button>
            }
            title="Отменить изменения?"
            description="Все несохранённые данные будут потеряны. Вы уверены, что хотите отменить?"
            confirmText="Да, отменить"
            cancelText="Продолжить редактирование"
            onConfirm={() => router.push(backHref)}
          />
          <Button type="submit" disabled={isSubmitting || disabled} className="px-5">
            {isSubmitting ? "Сохраняем..." : submitLabel}
          </Button>
        </div>
      </form>
      
      {/* ⚡ Billing v2.0: Paywall Modal */}
      {PaywallModalComponent}

      {/* 🤖 AI Generation Confirmation Dialog */}
      <AlertDialog open={showAiConfirmDialog} onOpenChange={setShowAiConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Генерация правил с помощью ИИ</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <p>
                Перед генерацией <strong>рекомендуется заполнить всю форму</strong>, так как ИИ учитывает следующие данные:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Название и описание события</li>
                <li>Категорию и тип автомобиля</li>
                <li>Допустимые марки авто</li>
                <li>Дополнительные поля регистрации</li>
                <li>Платность события</li>
              </ul>
              <p className="text-sm text-[#6B7280]">
                Чем больше информации вы укажете, тем более точными и релевантными будут сгенерированные правила.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowAiConfirmDialog(false);
                handleGenerateRules();
              }}
            >
              Продолжить генерацию
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
