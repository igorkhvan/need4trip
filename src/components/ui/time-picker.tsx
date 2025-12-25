/**
 * TimePicker Component - Выбор времени
 * 
 * Компактный выбор времени из списка.
 * Используется вместе с DatePicker.
 */

"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { generateTimeSlots } from "@/lib/utils/dates";

export interface TimePickerProps {
  /** Выбранное время в формате HH:mm */
  value?: string;
  /** Callback при изменении */
  onChange?: (time: string) => void;
  /** Шаг в минутах */
  minuteStep?: 5 | 10 | 15 | 30;
  /** Disabled состояние */
  disabled?: boolean;
  /** Error состояние */
  error?: boolean;
  /** Placeholder */
  placeholder?: string;
  /** CSS класс */
  className?: string;
  /** ID */
  id?: string;
}

export function TimePicker({
  value,
  onChange,
  minuteStep = 15,
  disabled,
  error,
  placeholder = "Выберите время",
  className,
  id,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selectedRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const timeSlots = React.useMemo(() => generateTimeSlots(minuteStep), [minuteStep]);

  // Нормализуем value к формату HH:mm (на случай если приходит HH:mm:ss)
  const normalizedValue = React.useMemo(() => {
    if (!value) return "";
    // Берём только первые 5 символов (HH:mm)
    return value.substring(0, 5);
  }, [value]);

  const displayValue = normalizedValue
    ? timeSlots.find((slot) => slot.value === normalizedValue)?.label || normalizedValue
    : null;

  const handleSelect = (time: string) => {
    onChange?.(time);
    setOpen(false);
  };

  // Scroll to selected time when opened
  React.useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        // Если есть выбранное значение - скроллим к нему
        if (selectedRef.current) {
          selectedRef.current.scrollIntoView({ 
            block: "center",
            behavior: "instant"
          });
        } 
        // Если нет выбранного, скроллим к 09:00 (рабочее время)
        else if (listRef.current) {
          const defaultTime = timeSlots.findIndex(slot => slot.value === "09:00");
          if (defaultTime !== -1) {
            const children = listRef.current.children;
            const defaultElement = children[defaultTime] as HTMLElement;
            defaultElement?.scrollIntoView({ 
              block: "center",
              behavior: "instant"
            });
          }
        }
      });
    }
  }, [open, timeSlots]);

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
            error && "border-red-500 focus:border-red-500",
            className
          )}
        >
          <span className="flex items-center gap-2 flex-1 text-left">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayValue || placeholder}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div ref={listRef} className="max-h-[300px] overflow-y-auto p-1">
          {timeSlots.map((slot) => {
            const isSelected = normalizedValue === slot.value;
            
            return (
              <button
                key={slot.value}
                ref={isSelected ? selectedRef : null}
                type="button"
                onClick={() => handleSelect(slot.value)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm rounded-lg transition-colors",
                  "hover:bg-[var(--color-bg-subtle)]",
                  "focus:outline-none focus:bg-[var(--color-primary-bg)]",
                  isSelected &&
                    "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] font-medium"
                )}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

