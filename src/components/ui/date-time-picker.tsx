/**
 * DateTimePicker Component
 * 
 * Reusable datetime picker следующий паттернам shadcn/ui и Need4Trip дизайн-системе.
 * Работает independently от форм - получает Date | null и вызывает onChange(Date | null).
 * 
 * Architecture:
 * - Compound components pattern (Root + Trigger + Content)
 * - Responsive: Popover (desktop) / Sheet (mobile)
 * - Composition: Calendar + TimeSelector + QuickActions
 * - Controlled через value + onChange
 * 
 * Usage:
 * ```tsx
 * <DateTimePicker
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   minuteStep={15}
 *   minDateTime={new Date()}
 * />
 * ```
 */

"use client";

import * as React from "react";
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  formatDateTime,
  generateTimeSlots,
  combineDateTime,
  extractTime,
  getNowRounded,
  addHours,
  isDateInRange,
} from "@/lib/utils/date-time";

export interface DateTimePickerProps {
  /** Выбранное значение (Date или null) */
  value?: Date | null;
  /** Callback при изменении значения */
  onChange?: (date: Date | null) => void;
  /** Шаг выбора минут (5, 10, 15, 30) */
  minuteStep?: 5 | 10 | 15 | 30;
  /** Минимальная доступная дата/время */
  minDateTime?: Date;
  /** Максимальная доступная дата/время */
  maxDateTime?: Date;
  /** Disabled состояние */
  disabled?: boolean;
  /** Placeholder текст когда значение не выбрано */
  placeholder?: string;
  /** CSS класс для триггера */
  className?: string;
  /** ID для accessibility */
  id?: string;
}

/**
 * TimeSelector - внутренний компонент для выбора времени
 */
interface TimeSelectorProps {
  value: string;
  onChange: (time: string) => void;
  minuteStep: number;
}

function TimeSelector({ value, onChange, minuteStep }: TimeSelectorProps) {
  const timeSlots = React.useMemo(() => generateTimeSlots(minuteStep), [minuteStep]);
  const selectedRef = React.useRef<HTMLButtonElement>(null);

  // Scroll to selected time on mount
  React.useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest" });
    }
  }, []);

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] pt-3 px-3 pb-3">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-[var(--color-text)]">Время</span>
      </div>
      
      <div className="max-h-[200px] overflow-y-auto rounded-lg border border-[var(--color-border)] bg-white">
        {timeSlots.map((slot) => {
          const isSelected = value === slot.value;
          
          return (
            <button
              key={slot.value}
              ref={isSelected ? selectedRef : null}
              type="button"
              onClick={() => onChange(slot.value)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors",
                "hover:bg-[var(--color-bg-subtle)]",
                "focus:outline-none focus:bg-[var(--color-primary-bg)]",
                isSelected &&
                  "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
              )}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * DateTimePickerContent - внутренний компонент с содержимым
 * Переиспользуется в Popover и Sheet
 */
function DateTimePickerContent({
  value,
  onChange,
  minuteStep = 15,
  minDateTime,
  maxDateTime,
  onClose,
}: DateTimePickerProps & { onClose?: () => void }) {
  // Локальное состояние для редактирования
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(value ?? null);
  const [selectedTime, setSelectedTime] = React.useState<string>(() => {
    return value ? extractTime(value) : "09:00";
  });

  // Синхронизируем с внешним value при изменении
  React.useEffect(() => {
    setSelectedDate(value ?? null);
    if (value) {
      setSelectedTime(extractTime(value));
    }
  }, [value]);

  // Обработчик выбора даты из календаря
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    
    // Комбинируем выбранную дату с текущим временем
    const combined = combineDateTime(date, selectedTime);
    
    // Проверяем constraints
    if (isDateInRange(combined, minDateTime, maxDateTime)) {
      onChange?.(combined);
    }
  };

  // Обработчик выбора времени
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    
    if (selectedDate) {
      const combined = combineDateTime(selectedDate, time);
      
      // Проверяем constraints
      if (isDateInRange(combined, minDateTime, maxDateTime)) {
        onChange?.(combined);
      }
    }
  };

  // Quick action: Сейчас
  const handleNow = () => {
    const now = getNowRounded(minuteStep);
    
    if (isDateInRange(now, minDateTime, maxDateTime)) {
      setSelectedDate(now);
      setSelectedTime(extractTime(now));
      onChange?.(now);
      onClose?.();
    }
  };

  // Quick action: +1 час
  const handlePlusOneHour = () => {
    const base = value ?? getNowRounded(minuteStep);
    const plusOne = addHours(base, 1);
    
    if (isDateInRange(plusOne, minDateTime, maxDateTime)) {
      setSelectedDate(plusOne);
      setSelectedTime(extractTime(plusOne));
      onChange?.(plusOne);
      onClose?.();
    }
  };

  // Quick action: Очистить
  const handleClear = () => {
    setSelectedDate(null);
    setSelectedTime("09:00");
    onChange?.(null);
    onClose?.();
  };

  return (
    <div className="flex flex-col w-full">
      {/* Calendar */}
      <Calendar
        selected={selectedDate}
        onSelect={handleDateSelect}
        minDate={minDateTime}
        maxDate={maxDateTime}
      />

      {/* Time Selector */}
      <TimeSelector
        value={selectedTime}
        onChange={handleTimeSelect}
        minuteStep={minuteStep}
      />

      {/* Quick Actions */}
      <div className="border-t-2 border-[var(--color-border)] bg-white pt-3 px-3 pb-3">
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNow}
            className="text-xs"
          >
            Сейчас
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePlusOneHour}
            className="text-xs"
          >
            +1 час
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="text-xs"
          >
            Очистить
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook для определения мобильного устройства
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

/**
 * DateTimePicker Component
 */
export function DateTimePicker({
  value,
  onChange,
  minuteStep = 15,
  minDateTime,
  maxDateTime,
  disabled,
  placeholder = "Выберите дату и время",
  className,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const displayValue = value ? formatDateTime(value) : null;

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(null);
  };

  // Desktop: Popover
  if (!isMobile) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              // Стили как у Input (48px height, 12px radius)
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
              <span className="truncate">
                {displayValue || placeholder}
              </span>
            </span>
            {displayValue && !disabled && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="!w-auto p-0" align="start" style={{ minWidth: '360px' }}>
          <DateTimePickerContent
            value={value}
            onChange={onChange}
            minuteStep={minuteStep}
            minDateTime={minDateTime}
            maxDateTime={maxDateTime}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Mobile: Sheet
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            // Стили как у Input
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
            <span className="truncate">
              {displayValue || placeholder}
            </span>
          </span>
          {displayValue && !disabled && (
            <X
              className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Выберите дату и время</SheetTitle>
        </SheetHeader>
        <DateTimePickerContent
          value={value}
          onChange={onChange}
          minuteStep={minuteStep}
          minDateTime={minDateTime}
          maxDateTime={maxDateTime}
          onClose={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

