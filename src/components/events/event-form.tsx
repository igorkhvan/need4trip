"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiBrandSelect, MultiBrandSelectOption } from "@/components/multi-brand-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { EventLocationInput } from "@/lib/types/eventLocation";
import { EventCategoryDto } from "@/lib/types/eventCategory";
import type { Club } from "@/lib/types/club";
import { getCategoryIcon } from "@/lib/utils/eventCategories";
import { getErrorMessage } from "@/lib/utils/errors";
import { useClubPlan } from "@/hooks/use-club-plan";
import { PaywallModal, usePaywall } from "@/components/billing/PaywallModal";
import { scrollToFirstError } from "@/lib/utils/form-validation";
// Section components
import { EventBasicInfoSection } from "./event-form/sections/EventBasicInfoSection";
import { EventLocationsSection } from "./event-form/sections/EventLocationsSection";
import { EventVehicleSection } from "./event-form/sections/EventVehicleSection";
import { EventRulesSection } from "./event-form/sections/EventRulesSection";
import { EventCustomFieldsSection } from "./event-form/sections/EventCustomFieldsSection";


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
  cityId: string;
  locations: EventLocationInput[];
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
  allowAnonymousRegistration: boolean; // NEW
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
  club?: Club | null; // Клуб, если событие создается от клуба (deprecated - use planLimits)
  planLimits?: {
    maxMembers: number | null;
    maxEventParticipants: number | null;
    allowPaidEvents: boolean;
    allowCsvExport: boolean;
  } | null; // Plan limits (from SSR or API)
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
  planLimits: planLimitsProp,
}: EventFormProps) {
  const router = useRouter();
  
  // ⚡ Billing v2.0: Support both SSR (planLimits prop) and CSR (useClubPlan hook)
  // Prefer planLimits prop if provided (SSR, instant, no API call)
  // Fall back to useClubPlan hook for backward compatibility (CSR, API call)
  const { limits: clubLimitsFromHook, loading: loadingPlan } = useClubPlan(
    planLimitsProp ? null : club?.id
  );
  
  const { showPaywall, PaywallModalComponent } = usePaywall();
  
  // Use planLimits prop if available (SSR), otherwise use hook result (CSR)
  const effectiveLimits = planLimitsProp ?? clubLimitsFromHook;
  
  // Determine max participants based on plan limits (default to 30 for Free)
  const maxAllowedParticipants = effectiveLimits?.maxEventParticipants ?? 30;
  
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
  const [locations, setLocations] = useState<EventLocationInput[]>(
    initialValues?.locations ?? [{ sortOrder: 1, title: "Точка сбора", latitude: null, longitude: null, rawInput: null }]
  );
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
  const [allowAnonymousRegistration, setAllowAnonymousRegistration] = useState<boolean>(initialValues?.allowAnonymousRegistration ?? true); // NEW
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingRules, setIsGeneratingRules] = useState(false);
  const [showAiConfirmDialog, setShowAiConfirmDialog] = useState(false);
  const [showRequiredFieldsDialog, setShowRequiredFieldsDialog] = useState(false);
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([]);

  const sortedFields = useMemo(
    () => [...customFields].sort((a, b) => a.order - b.order),
    [customFields]
  );

  // Track if user has interacted with maxParticipants field
  const [hasUserSetMaxParticipants, setHasUserSetMaxParticipants] = useState(false);
  
  // Auto-fill maxParticipants with plan limit for new events (only once, on initial load)
  useEffect(() => {
    if (mode === 'create' && maxParticipants === null && effectiveLimits && !loadingPlan && !hasUserSetMaxParticipants) {
      // Set default maxParticipants to plan limit
      if (effectiveLimits.maxEventParticipants !== null && effectiveLimits.maxEventParticipants > 0) {
        setMaxParticipants(effectiveLimits.maxEventParticipants);
      }
    }
  }, [mode, maxParticipants, effectiveLimits, loadingPlan, hasUserSetMaxParticipants]);

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
    } else {
      // Валидация даты: требуем чтобы дата была минимум через 5 минут
      const date5MinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      if (parsedDate < date5MinutesFromNow) {
        issues.dateTime = "Дата должна быть в будущем (минимум через 5 минут)";
      }
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
      trimmedPrice,
    };
  };

  const handleAiButtonClick = () => {
    // Build list of missing required fields
    const missing: string[] = [];
    
    // Check basic required fields ONLY
    if (!title.trim()) {
      missing.push("Название события");
      setFieldErrors(prev => ({ ...prev, title: "Укажите название события" }));
    }
    if (!categoryId) {
      missing.push("Категория события");
      setFieldErrors(prev => ({ ...prev, categoryId: "Выберите категорию" }));
    }
    if (!cityId) {
      missing.push("Город");
      setFieldErrors(prev => ({ ...prev, cityId: "Выберите город" }));
    }
    
    // If any required fields are missing, show error dialog
    if (missing.length > 0) {
      setMissingFieldsList(missing);
      setShowRequiredFieldsDialog(true);
      return;
    }
    
    // All required fields are filled - show confirmation dialog
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
        allowAnonymousRegistration, // NEW
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
      trimmedPrice,
    } = validate();
    if (Object.keys(issues).length) {
      setFieldErrors(issues);
      
      // Scroll to first error field with offset for header
      setTimeout(() => {
        scrollToFirstError({ offset: 100 });
      }, 100);
      
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
      locations, // Multiple location points
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
      allowAnonymousRegistration, // NEW
    };

    try {
      await onSubmit(payload);
      // Редирект и обновление страницы делает родительский компонент (после onSubmit)
      // Не делаем здесь, чтобы избежать конфликтов и дать родителю контроль
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
    <div className="space-y-6 pb-6 pt-8 sm:pb-10 sm:pt-12">
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
          <h1 className="heading-hero">
            {headerTitle}
          </h1>
          <p className="text-body-small">{headerDescription}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-xs sm:text-sm font-semibold text-white">
                1
              </div>
              <div>
                <CardTitle className="heading-h2 !mb-0">Основные данные</CardTitle>
                <CardDescription className="text-body-small !mt-1">
                  Название, описание, дата, место, видимость
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <EventBasicInfoSection
              title={title}
              description={description}
              categoryId={categoryId}
              dateTime={dateTime}
              cityId={cityId}
              maxParticipants={maxParticipants}
              visibility={visibility}
              isPaid={isPaid}
              price={price}
              currencyCode={currencyCode}
              isClubEvent={isClubEvent}
              allowAnonymousRegistration={allowAnonymousRegistration}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onCategoryChange={setCategoryId}
              onDateTimeChange={setDateTime}
              onCityChange={setCityId}
              onMaxParticipantsChange={(value, userEdited) => {
                if (userEdited) setHasUserSetMaxParticipants(true);
                setMaxParticipants(value);
              }}
              onVisibilityChange={setVisibility}
              onIsPaidChange={setIsPaid}
              onPriceChange={setPrice}
              onCurrencyChange={setCurrencyCode}
              onIsClubEventChange={setIsClubEvent}
              onAllowAnonymousRegistrationChange={setAllowAnonymousRegistration}
              categories={categories}
              loadingCategories={loadingCategories}
              loadingPlan={loadingPlan}
              maxAllowedParticipants={maxAllowedParticipants}
              fieldErrors={fieldErrors}
              clearFieldError={(field) => {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next[field];
                  return next;
                });
              }}
              disabled={disabled}
              club={club}
            />
          </CardContent>
        </Card>

        {/* Section 2: Event Locations */}
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-xs sm:text-sm font-semibold text-white">
                2
              </div>
              <div>
                <CardTitle className="heading-h2 !mb-0">Точки маршрута</CardTitle>
                <CardDescription className="text-body-small !mt-1">
                  Укажите места сбора и остановок. Первая точка обязательна.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <EventLocationsSection
              locations={locations}
              onLocationsChange={setLocations}
              fieldErrors={fieldErrors}
              clearFieldError={(field) => {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next[field];
                  return next;
                });
              }}
              disabled={disabled}
            />
          </CardContent>
        </Card>

        {/* Section 3: Vehicle Requirements */}
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-xs sm:text-sm font-semibold text-white">
                3
              </div>
              <div>
                <CardTitle className="heading-h2 !mb-0">Требования к автомобилю</CardTitle>
                <CardDescription className="text-body-small !mt-1">
                  Тип авто и допустимые марки
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <EventVehicleSection
              vehicleType={vehicleType}
              allowedBrandIds={allowedBrandIds}
              onVehicleTypeChange={setVehicleType}
              onAllowedBrandsChange={setAllowedBrandIds}
              brands={brands}
              vehicleTypes={vehicleTypes}
              fieldErrors={fieldErrors}
              disabled={disabled}
            />
          </CardContent>
        </Card>

        {/* Section 4: Rules */}
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-xs sm:text-sm font-semibold text-white">
                  4
                </div>
                <div>
                  <CardTitle className="heading-h2 !mb-0">Правила участия</CardTitle>
                  <CardDescription className="text-body-small !mt-1">
                    Показываются в карточке события
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAiButtonClick}
                disabled={disabled || isGeneratingRules || isSubmitting}
              >
                ✨ AI
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <EventRulesSection
              rules={rules}
              onRulesChange={setRules}
              onGenerateAi={handleAiButtonClick}
              isGeneratingRules={isGeneratingRules}
              disabled={disabled}
              isSubmitting={isSubmitting}
            />
          </CardContent>
        </Card>

        {/* Section 5: Custom Fields */}
        <Card className="border border-[#E5E7EB] shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#FF6F2C] text-xs sm:text-sm font-semibold text-white">
                5
              </div>
              <div>
                <CardTitle className="heading-h2 !mb-0">Дополнительные поля регистрации</CardTitle>
                <CardDescription className="text-body-small !mt-1">
                  Поля, которые заполняют участники
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <EventCustomFieldsSection
              sortedFields={sortedFields}
              onAddField={addField}
              onUpdateField={updateField}
              onRemoveField={removeField}
              lockedFieldIds={lockedFieldIds}
              hasLockedFields={hasLockedFields}
              fieldErrors={fieldErrors}
              clearFieldError={(field) => {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next[field];
                  return next;
                });
              }}
              disabled={disabled}
            />
          </CardContent>
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

      {/* 🚫 Required Fields Error Dialog */}
      <AlertDialog open={showRequiredFieldsDialog} onOpenChange={setShowRequiredFieldsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Заполните обязательные поля</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <p>
                Для генерации правил необходимо заполнить следующие обязательные поля:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {missingFieldsList.map((field, idx) => (
                  <li key={idx}>{field}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowRequiredFieldsDialog(false)}>
              Понятно
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <p className="text-sm text-muted-foreground">
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
