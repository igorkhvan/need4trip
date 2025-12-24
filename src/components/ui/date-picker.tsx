/**
 * DatePicker Component - Простой выбор даты
 * 
 * Только календарь, без времени.
 * Время вводится отдельным полем.
 */

"use client";

import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DatePickerProps {
  /** Выбранная дата */
  value?: Date | null;
  /** Callback при изменении */
  onChange?: (date: Date | null) => void;
  /** Минимальная дата */
  minDate?: Date;
  /** Максимальная дата */
  maxDate?: Date;
  /** Disabled состояние */
  disabled?: boolean;
  /** Placeholder */
  placeholder?: string;
  /** CSS класс */
  className?: string;
  /** ID */
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  placeholder = "Выберите дату",
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const displayValue = value
    ? value.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(null);
  };

  const handleSelect = (date: Date) => {
    onChange?.(date);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-2 rounded-xl bg-white px-4 text-base text-[var(--color-text)]",
            "border border-[var(--color-border)]",
            "hover:border-[#D1D5DB]",
            "focus:border-[var(--color-primary)] focus:outline-none",
            "transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--color-bg-subtle)]",
            !displayValue && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2 flex-1 text-left">
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayValue || placeholder}</span>
          </span>
          {displayValue && !disabled && (
            <X
              className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          selected={value}
          onSelect={handleSelect}
          minDate={minDate}
          maxDate={maxDate}
        />
      </PopoverContent>
    </Popover>
  );
}

