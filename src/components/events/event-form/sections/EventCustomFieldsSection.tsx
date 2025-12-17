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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
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
    <>
      <div className="flex items-center gap-3">
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
                            onUpdateField(field.id, { label: e.target.value });
                            if (errorText) {
                              clearFieldError(`customFieldsSchema.${index}.label`);
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
                        {isLocked && (
                          <p className="text-xs text-[#6B7280]">Тип нельзя изменить</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm text-[#374151]">
                        <Checkbox
                          checked={field.required}
                          onChange={(e) => onUpdateField(field.id, { required: e.target.checked })}
                          disabled={disabled}
                        />
                        Обязательное
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        onClick={() => onRemoveField(field.id)}
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
          onClick={onAddField}
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
    </>
  );
}
