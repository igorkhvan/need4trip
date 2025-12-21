/**
 * EventCustomFieldsSection - Custom registration fields section
 * 
 * Part of EventForm refactoring (Phase 1)
 * Extracted from monolithic event-form.tsx
 * 
 * Responsibilities:
 * - Display custom registration fields
 * - Add/Edit/Remove fields
 * - Handle locked fields (used by participants)
 */

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { FieldCard } from "@/components/ui/field-card";
import { EventCustomFieldSchema, EventCustomFieldType } from "@/lib/types/event";

const FIELD_TYPE_OPTIONS: { value: EventCustomFieldType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "number", label: "Число" },
  { value: "boolean", label: "Да / Нет" },
];

interface EventCustomFieldsSectionProps {
  // Form values
  sortedFields: EventCustomFieldSchema[];
  
  // Change handlers
  onAddField: () => void;
  onUpdateField: (id: string, patch: Partial<EventCustomFieldSchema>) => void;
  onRemoveField: (id: string) => void;
  
  // Locked fields (participants exist)
  lockedFieldIds: string[];
  hasLockedFields: boolean;
  
  // Validation
  fieldErrors: Record<string, string>;
  clearFieldError: (field: string) => void;
  
  // UI state
  disabled?: boolean;
}

export function EventCustomFieldsSection({
  sortedFields,
  onAddField,
  onUpdateField,
  onRemoveField,
  lockedFieldIds,
  hasLockedFields,
  fieldErrors,
  clearFieldError,
  disabled,
}: EventCustomFieldsSectionProps) {
  const fieldError = (path: string) => fieldErrors[path];
  
  return (
    <div className="space-y-4">
        {sortedFields.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-6 text-center text-sm text-[#6B7280]">
            Добавьте первое поле регистрации
          </div>
        ) : (
          <div className="space-y-4">
            {sortedFields.map((field, index) => {
              const errorText = fieldError(`customFieldsSchema.${index}.label`);
              const isLocked = lockedFieldIds.includes(field.id);
              return (
                <FieldCard
                  key={field.id}
                  index={index + 1}
                  isLocked={isLocked}
                  lockMessage="Используется участниками — удаление запрещено"
                  onDelete={() => onRemoveField(field.id)}
                  deleteDisabled={disabled}
                  variant="subtle"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      id={`field-label-${field.id}`}
                      label="Название поля"
                      required
                      error={errorText}
                    >
                      <Input
                        value={field.label}
                        placeholder="Например: Наличие рации"
                        className={errorText ? "border-red-500 focus:border-red-500" : ""}
                        onChange={(e) => {
                          onUpdateField(field.id, { label: e.target.value });
                          if (errorText) {
                            clearFieldError(`customFieldsSchema.${index}.label`);
                          }
                        }}
                        disabled={disabled}
                      />
                    </FormField>

                    <FormField
                      id={`field-type-${field.id}`}
                      label="Тип"
                      required
                      hint={isLocked ? "Тип нельзя изменить" : undefined}
                    >
                      <Select
                        value={
                          FIELD_TYPE_OPTIONS.some((opt) => opt.value === field.type) ? field.type : "text"
                        }
                        onValueChange={(value) => onUpdateField(field.id, { type: value as EventCustomFieldType })}
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
                    </FormField>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={field.required}
                      onChange={(e) => onUpdateField(field.id, { required: e.target.checked })}
                      disabled={disabled}
                    />
                    <label className="text-sm text-[#374151] cursor-pointer select-none">
                      Обязательное поле
                    </label>
                  </div>
                </FieldCard>
              );
            })}
          </div>
        )}

      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          type="button"
          onClick={onAddField}
          disabled={disabled}
          className="h-11 gap-2"
        >
          <Plus className="h-4 w-4" />
          Добавить поле
        </Button>
      </div>

      {hasLockedFields && (
        <p className="mt-2 text-xs text-[#6B7280]">
          Вы можете добавлять новые поля, но не можете удалять существующие, так как они используются участниками.
        </p>
      )}
    </div>
  );
}
