/**
 * EventBasicInfoSection - Basic event information section
 * 
 * Part of EventForm refactoring (Phase 1)
 * Extracted from monolithic event-form.tsx
 * 
 * Responsibilities:
 * - Title, Description
 * - City, DateTime, Location
 * - MaxParticipants (with club limits)
 * - Category
 * - Visibility
 * - IsClubEvent flag
 */

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
import { Switch } from "@/components/ui/switch";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { CurrencySelect } from "@/components/ui/currency-select";
import { FormField } from "@/components/ui/form-field";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Visibility } from "@/lib/types/event";
import { EventCategoryDto } from "@/lib/types/eventCategory";
import type { Club } from "@/lib/types/club";

interface EventBasicInfoSectionProps {
  // Form values
  title: string;
  description: string;
  categoryId: string | null;
  dateTime: string;
  cityId: string | null;
  maxParticipants: number | null;
  visibility: Visibility;
  isPaid: boolean;
  price: string;
  currencyCode: string | null;
  allowAnonymousRegistration: boolean;
  
  // Change handlers
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onDateTimeChange: (value: string) => void;
  onCityChange: (value: string | null) => void;
  onMaxParticipantsChange: (value: number | null, userEdited: boolean) => void;
  onVisibilityChange: (value: Visibility) => void;
  onIsPaidChange: (value: boolean) => void;
  onPriceChange: (value: string) => void;
  onCurrencyChange: (value: string | null) => void;
  onAllowAnonymousRegistrationChange: (value: boolean) => void;
  
  // External data
  categories: EventCategoryDto[];
  loadingCategories: boolean;
  
  // Plan limits (for maxParticipants validation)
  loadingPlan: boolean;
  maxAllowedParticipants: number;
  
  // Validation
  fieldErrors: Record<string, string>;
  clearFieldError: (field: string) => void;
  
  // UI state
  disabled?: boolean;
  /** Beta mode: hide paid event fields (Тип участия, Цена, Валюта)
   *  SSOT: docs/product/BETA_TEMPORARY_GATES_AND_DEVIATIONS.md §3.6 */
  isBetaMode?: boolean;
}

export function EventBasicInfoSection({
  title,
  description,
  categoryId,
  dateTime,
  cityId,
  maxParticipants,
  visibility,
  isPaid,
  price,
  currencyCode,
  allowAnonymousRegistration,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onDateTimeChange,
  onCityChange,
  onMaxParticipantsChange,
  onVisibilityChange,
  onIsPaidChange,
  onPriceChange,
  onCurrencyChange,
  onAllowAnonymousRegistrationChange,
  categories,
  loadingCategories,
  loadingPlan,
  maxAllowedParticipants,
  fieldErrors,
  clearFieldError,
  disabled,
  isBetaMode = false,
}: EventBasicInfoSectionProps) {
  return (
    <div className="space-y-4">
      {/* Title & City - grid layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          id="title"
          label="Название события"
          required
          error={fieldErrors.title}
        >
          <Input
            id="title"
            value={title}
            onChange={(e) => {
              onTitleChange(e.target.value);
              if (fieldErrors.title) {
                clearFieldError("title");
              }
            }}
            disabled={disabled}
            placeholder="Например: зимний выезд в горы"
            className={fieldErrors.title ? "border-red-500 focus:border-red-500" : ""}
          />
        </FormField>

        <FormField
          id="cityId"
          label="Город"
          required
          error={fieldErrors.cityId}
        >
          <CityAutocomplete
            value={cityId}
            onChange={(newCityId) => {
              onCityChange(newCityId);
              if (fieldErrors.cityId) {
                clearFieldError("cityId");
              }
            }}
            disabled={disabled}
            placeholder="Выберите город..."
            error={!!fieldErrors.cityId}
          />
        </FormField>
      </div>

      {/* Description */}
      <FormField
        id="description"
        label="Описание"
        required
        error={fieldErrors.description}
      >
        <Textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => {
            onDescriptionChange(e.target.value);
            if (fieldErrors.description) {
              clearFieldError("description");
            }
          }}
          disabled={disabled}
          placeholder="Расскажите о маршруте, программе и особенностях поездки..."
          className={fieldErrors.description ? "border-red-500 focus:border-red-500" : ""}
        />
      </FormField>

      {/* Date/Time & Category - grid layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Date & Time - nested grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            id="eventDate"
            label="Дата"
            required
            error={fieldErrors.dateTime}
          >
            <DatePicker
              id="eventDate"
              value={dateTime ? new Date(dateTime) : null}
              onChange={(date) => {
                if (date) {
                  // Сохраняем время, если оно было
                  const timeMatch = dateTime.match(/T(\d{2}:\d{2})/);
                  const time = timeMatch ? timeMatch[1] : "09:00";
                  // Используем локальную дату без конвертации в UTC
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  const combined = `${year}-${month}-${day}T${time}`;
                  onDateTimeChange(combined);
                } else {
                  onDateTimeChange("");
                }
                if (fieldErrors.dateTime) {
                  clearFieldError("dateTime");
                }
              }}
              minDate={new Date(new Date().setHours(0, 0, 0, 0))} // сегодня (начало дня)
              disabled={disabled}
              error={!!fieldErrors.dateTime}
              placeholder="Выберите дату"
            />
          </FormField>

          <FormField
            id="eventTime"
            label="Время"
            required
            error={fieldErrors.dateTime}
          >
            <TimePicker
              id="eventTime"
              value={dateTime ? dateTime.split('T')[1]?.substring(0, 5) || "" : ""}
              onChange={(time) => {
                if (dateTime) {
                  const date = dateTime.split('T')[0];
                  onDateTimeChange(`${date}T${time}`);
                } else {
                  // Если даты нет, ставим сегодня
                  const today = new Date().toISOString().split('T')[0];
                  onDateTimeChange(`${today}T${time}`);
                }
                if (fieldErrors.dateTime) {
                  clearFieldError("dateTime");
                }
              }}
              minuteStep={15}
              disabled={disabled}
              error={!!fieldErrors.dateTime}
              placeholder="Выберите время"
            />
          </FormField>
        </div>

        {/* SSOT: SSOT_UI_COPY §2.2 - Inline async: ❌ No text */}
        {/* FIX: Removed text "Загрузка категорий...", spinner-only */}
        <FormField
          id="category"
          label="Категория события"
          required
          error={fieldErrors.categoryId}
        >
          {loadingCategories ? (
            <div className="h-12 w-full rounded-xl border border-[#E5E7EB] bg-gray-50 flex items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-[#FF6F2C] border-r-transparent" />
            </div>
          ) : (
            <Select
              value={categoryId || ""}
              onValueChange={(val) => {
                // Ignore empty string changes (Radix UI bug)
                if (val === "" && categoryId) {
                  return;
                }
                onCategoryChange(val || null);
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
        </FormField>
      </div>

      {/* Visibility & MaxParticipants - grid layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          id="visibility"
          label="Видимость события"
          required
        >
          <Select
            value={visibility}
            onValueChange={(val) => onVisibilityChange(val as Visibility)}
            disabled={disabled}
          >
            <SelectTrigger id="visibility">
              <SelectValue placeholder="Кто видит событие" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Публичный (доступно всем)</SelectItem>
              <SelectItem value="unlisted">Скрытый (по ссылке доступно всем)</SelectItem>
              <SelectItem value="restricted">Скрытый (по ссылке доступно авторизованным)</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id="maxParticipants"
          label="Максимум экипажей"
          required
          error={fieldErrors.maxParticipants}
          hint={
            !loadingPlan
              ? `Ваш лимит: ${maxAllowedParticipants === Infinity ? '∞' : maxAllowedParticipants}`
              : undefined
          }
        >
          <Input
            id="maxParticipants"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min={1}
            max={maxAllowedParticipants === null || maxAllowedParticipants === Infinity ? undefined : maxAllowedParticipants}
            value={maxParticipants ?? ""}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, "");
              onMaxParticipantsChange(digitsOnly ? Number(digitsOnly) : null, true);
              if (fieldErrors.maxParticipants) {
                clearFieldError("maxParticipants");
              }
            }}
            disabled={disabled || loadingPlan}
            placeholder={maxAllowedParticipants === null || maxAllowedParticipants === Infinity ? '∞' : String(maxAllowedParticipants)}
            className={fieldErrors.maxParticipants ? "border-red-500 focus:border-red-500" : ""}
          />
        </FormField>
      </div>

      {/* Тип участия & Price/Currency - grid layout
          Beta mode: entire block hidden (paid events not available during beta)
          SSOT: docs/product/BETA_TEMPORARY_GATES_AND_DEVIATIONS.md §3.6 */}
      {!isBetaMode && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            id="participationType"
            label="Тип участия"
            required
          >
            <Select
              value={isPaid ? "paid" : "free"}
              onValueChange={(val) => onIsPaidChange(val === "paid")}
              disabled={disabled}
            >
              <SelectTrigger id="participationType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Бесплатное</SelectItem>
                <SelectItem value="paid">Платное</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {/* Price & Currency - nested grid (only if paid) */}
          {isPaid ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                id="price"
                label="Цена"
                required
                error={fieldErrors.price}
              >
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
                    onPriceChange(digitsOnly);
                    if (fieldErrors.price) {
                      clearFieldError("price");
                    }
                  }}
                  disabled={disabled}
                  placeholder="5000"
                  className={fieldErrors.price ? "border-red-500 focus:border-red-500" : ""}
                />
              </FormField>

              <FormField
                id="currency"
                label="Валюта"
                required
                error={fieldErrors.currencyCode}
              >
                <CurrencySelect
                  value={currencyCode}
                  onChange={(newCode) => {
                    onCurrencyChange(newCode);
                    if (fieldErrors.currencyCode) {
                      clearFieldError("currencyCode");
                    }
                  }}
                  disabled={disabled}
                  placeholder="Выберите валюту..."
                />
              </FormField>
            </div>
          ) : (
            <div></div>
          )}
        </div>
      )}
      
      {/* Registration Controls */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background-subtle)] p-4 space-y-4">
        <h3 className="text-base font-semibold text-[var(--color-text)]">
          Настройки регистрации
        </h3>
        
        {/* Allow Anonymous Registration */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <Label htmlFor="allowAnonymousRegistration" className="text-sm font-medium text-[var(--color-text)]">
              Разрешить регистрацию без авторизации
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Если включено, незарегистрированные пользователи смогут присоединяться к событию
            </p>
          </div>
          <Switch
            id="allowAnonymousRegistration"
            checked={allowAnonymousRegistration}
            onCheckedChange={onAllowAnonymousRegistrationChange}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
