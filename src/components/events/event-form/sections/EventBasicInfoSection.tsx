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
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { FormField } from "@/components/ui/form-field";
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
  isClubEvent: boolean;
  
  // Change handlers
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onDateTimeChange: (value: string) => void;
  onCityChange: (value: string | null) => void;
  onMaxParticipantsChange: (value: number | null, userEdited: boolean) => void;
  onVisibilityChange: (value: Visibility) => void;
  onIsPaidChange: (value: boolean) => void;
  onIsClubEventChange: (value: boolean) => void;
  
  // External data
  categories: EventCategoryDto[];
  loadingCategories: boolean;
  
  // Club limits (for maxParticipants)
  clubLimits: { maxEventParticipants: number | null } | null;
  loadingPlan: boolean;
  maxAllowedParticipants: number;
  
  // Validation
  fieldErrors: Record<string, string>;
  clearFieldError: (field: string) => void;
  
  // UI state
  disabled?: boolean;
  club?: Club | null;
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
  isClubEvent,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onDateTimeChange,
  onCityChange,
  onMaxParticipantsChange,
  onVisibilityChange,
  onIsPaidChange,
  onIsClubEventChange,
  categories,
  loadingCategories,
  clubLimits,
  loadingPlan,
  maxAllowedParticipants,
  fieldErrors,
  clearFieldError,
  disabled,
  club,
}: EventBasicInfoSectionProps) {
  return (
    <div className="space-y-4">
      {/* Title & City - NEW: grid layout */}
      <div className="grid gap-4 md:grid-cols-2">
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

      {/* DateTime */}
      <FormField
        id="dateTime"
        label="Дата и время"
        required
        error={fieldErrors.dateTime}
      >
        <Input
          id="dateTime"
          type="datetime-local"
          value={dateTime}
          onChange={(e) => onDateTimeChange(e.target.value)}
          disabled={disabled}
          className={fieldErrors.dateTime ? "border-red-500 focus:border-red-500" : ""}
        />
      </FormField>

      {/* Category - Moved up */}
      <FormField
        id="category"
        label="Категория события"
        required
        error={fieldErrors.categoryId}
      >
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

      {/* Visibility - Moved up */}
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
            <SelectItem value="public">Публичный (видно всем)</SelectItem>
            <SelectItem value="unlisted">По прямой ссылке</SelectItem>
            <SelectItem value="restricted">Только участникам/клубу</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {/* Тип участия - NEW: Moved from EventPricingSection */}
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

      {/* MaxParticipants - Renamed label */}
      <FormField
        id="maxParticipants"
        label="Максимум экипажей"
        required
        error={fieldErrors.maxParticipants}
        hint={
          clubLimits && !loadingPlan
            ? `Ваш лимит: ${maxAllowedParticipants === null || maxAllowedParticipants === Infinity ? '∞' : maxAllowedParticipants}`
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
  );
}
