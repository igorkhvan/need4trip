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
import { generateTimeSlots } from "@/lib/utils/date-time";

export interface TimePickerProps {
  /** Выбранное время в формате HH:mm */
  value?: string;
  /** Callback при изменении */
  onChange?: (time: string) => void;
  /** Шаг в минутах */
  minuteStep?: 5 | 10 | 15 | 30;
  /** Disabled состояние */
  disabled?: boolean;
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
  placeholder = "Выберите время",
  className,
  id,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selectedRef = React.useRef<HTMLButtonElement>(null);

  const timeSlots = React.useMemo(() => generateTimeSlots(minuteStep), [minuteStep]);

  const displayValue = value
    ? timeSlots.find((slot) => slot.value === value)?.label || value
    : null;

  const handleSelect = (time: string) => {
    onChange?.(time);
    setOpen(false);
  };

  // Scroll to selected time when opened
  React.useEffect(() => {
    if (open && selectedRef.current) {
      setTimeout(() => {
        selectedRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
      }, 0);
    }
  }, [open]);

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
            <Clock className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayValue || placeholder}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto p-1">
          {timeSlots.map((slot) => {
            const isSelected = value === slot.value;
            
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

