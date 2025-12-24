/**
 * DateTimeField Component
 * 
 * Form adapter для DateTimePicker компонента.
 * Handles conversion между Date objects и form string values (datetime-local format).
 * Integrates с существующими form error handling patterns.
 * 
 * Usage in forms:
 * ```tsx
 * <DateTimeField
 *   id="dateTime"
 *   label="Дата и время"
 *   value={dateTimeString} // "YYYY-MM-DDTHH:mm"
 *   onChange={setDateTime}
 *   required
 *   error={fieldErrors.dateTime}
 *   minDateTime={new Date()}
 * />
 * ```
 */

"use client";

import * as React from "react";
import { DateTimePicker, DateTimePickerProps } from "@/components/ui/date-time-picker";
import { FormField } from "@/components/ui/form-field";
import { parseDateTime, serializeDateTime } from "@/lib/utils/date-time";

export interface DateTimeFieldProps
  extends Omit<DateTimePickerProps, "value" | "onChange"> {
  /** ID поля (для label и accessibility) */
  id: string;
  /** Label текст */
  label: string;
  /** Значение в формате "YYYY-MM-DDTHH:mm" (datetime-local) */
  value: string;
  /** Callback при изменении - получает строку в формате datetime-local */
  onChange: (value: string) => void;
  /** Обязательное поле */
  required?: boolean;
  /** Текст ошибки валидации */
  error?: string;
  /** Callback для очистки ошибки при изменении */
  onErrorClear?: () => void;
  /** Дополнительный hint текст (всегда видимый) */
  hint?: string;
}

/**
 * DateTimeField - форм-адаптер для DateTimePicker
 * Конвертирует между Date (UI) и string (форма)
 */
export function DateTimeField({
  id,
  label,
  value,
  onChange,
  required,
  error,
  onErrorClear,
  hint,
  minuteStep = 15,
  minDateTime,
  maxDateTime,
  disabled,
  placeholder,
  className,
}: DateTimeFieldProps) {
  // Конвертируем строку формы в Date для пикера
  const dateValue = React.useMemo(() => parseDateTime(value), [value]);

  // Обработчик изменения из пикера
  const handleChange = React.useCallback(
    (date: Date | null) => {
      // Конвертируем Date обратно в строку для формы
      const serialized = serializeDateTime(date);
      onChange(serialized);

      // Очищаем ошибку при изменении (если есть callback)
      if (error && onErrorClear) {
        onErrorClear();
      }
    },
    [onChange, error, onErrorClear]
  );

  return (
    <FormField
      id={id}
      label={label}
      required={required}
      error={error}
      hint={hint}
    >
      <DateTimePicker
        id={id}
        value={dateValue}
        onChange={handleChange}
        minuteStep={minuteStep}
        minDateTime={minDateTime}
        maxDateTime={maxDateTime}
        disabled={disabled}
        placeholder={placeholder}
        className={error ? "border-red-500 focus:border-red-500" : className}
      />
    </FormField>
  );
}

