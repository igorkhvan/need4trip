/**
 * Calendar Component
 * 
 * Month-grid календарь для выбора даты в соответствии с дизайн-системой Need4Trip.
 * Используется в DateTimePicker и других компонентах.
 * 
 * Features:
 * - Навигация по месяцам/годам
 * - Поддержка min/max дат
 * - Русская локализация
 * - Disabled состояние
 * - Keyboard navigation
 * 
 * Design:
 * - Grid 7×6 (всегда 7 колонок, 6 рядов)
 * - Min-width для предотвращения схлопывания
 * - Использует CSS variables для цветов
 */

"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const WEEKDAYS_SHORT_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export interface CalendarProps {
  /** Выбранная дата */
  selected?: Date | null;
  /** Callback при выборе даты */
  onSelect?: (date: Date) => void;
  /** Минимальная доступная дата */
  minDate?: Date;
  /** Максимальная доступная дата */
  maxDate?: Date;
  /** Disabled состояние */
  disabled?: boolean;
  /** CSS класс */
  className?: string;
}

export function Calendar({
  selected,
  onSelect,
  minDate,
  maxDate,
  disabled,
  className,
}: CalendarProps) {
  // Текущий отображаемый месяц/год (не обязательно выбранная дата)
  const [viewDate, setViewDate] = React.useState(() => {
    if (selected) return new Date(selected);
    return new Date();
  });

  // Синхронизируем viewDate с выбранной датой
  React.useEffect(() => {
    if (selected) {
      setViewDate(new Date(selected));
    }
  }, [selected]);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Получаем дни для отображения в календаре (42 дня = 6 недель)
  const calendarDays = React.useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Понедельник = 1, Воскресенье = 0
    let startDayOfWeek = firstDay.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7; // Воскресенье становится 7
    
    const daysInMonth = lastDay.getDate();
    const prevMonthDays = startDayOfWeek - 1;
    
    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }> = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Дни предыдущего месяца
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: true,
      });
    }
    
    // Дни текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateTime = date.getTime();
      
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selected 
        ? date.toDateString() === new Date(selected).toDateString()
        : false;
      
      let isDisabled = false;
      if (minDate) {
        const minDateTime = new Date(minDate);
        minDateTime.setHours(0, 0, 0, 0);
        if (dateTime < minDateTime.getTime()) isDisabled = true;
      }
      if (maxDate) {
        const maxDateTime = new Date(maxDate);
        maxDateTime.setHours(0, 0, 0, 0);
        if (dateTime > maxDateTime.getTime()) isDisabled = true;
      }
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        isSelected,
        isDisabled,
      });
    }
    
    // Дни следующего месяца (чтобы заполнить 6 недель)
    const remainingDays = 42 - days.length; // 6 недель × 7 дней
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        isDisabled: true,
      });
    }
    
    return days;
  }, [currentYear, currentMonth, selected, minDate, maxDate]);

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDate = (date: Date, isDisabled: boolean) => {
    if (disabled || isDisabled) return;
    onSelect?.(date);
  };

  return (
    <div className={cn("w-full min-w-[280px] p-3", className)}>
      {/* Заголовок с навигацией */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handlePrevMonth}
          disabled={disabled}
          type="button"
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="text-base font-semibold text-[var(--color-text)]">
          {MONTHS_RU[currentMonth]} {currentYear}
        </div>
        
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleNextMonth}
          disabled={disabled}
          type="button"
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Дни недели */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS_SHORT_RU.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Дни месяца (grid 7×6) */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const dayNumber = day.date.getDate();
          
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectDate(day.date, day.isDisabled)}
              disabled={disabled || day.isDisabled}
              className={cn(
                "h-9 w-full text-sm font-medium rounded-lg transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1",
                // Дни не текущего месяца
                !day.isCurrentMonth && "text-muted-foreground opacity-40",
                // Текущий день (сегодня)
                day.isToday && !day.isSelected && 
                  "bg-[var(--color-bg-subtle)] font-bold ring-1 ring-[var(--color-border)]",
                // Выбранный день
                day.isSelected && 
                  "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] font-bold",
                // Обычный день текущего месяца
                day.isCurrentMonth && !day.isSelected && !day.isDisabled && 
                  "hover:bg-[var(--color-bg-subtle)] text-[var(--color-text)]",
                // Disabled день
                day.isDisabled && "cursor-not-allowed opacity-30",
              )}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}

