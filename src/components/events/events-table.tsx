"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Event, EventCategory } from "@/lib/types/event";

type SortKey = "date" | "created" | "title" | "category";
type SortDir = "asc" | "desc";

const CATEGORY_LABELS: Record<EventCategory, string> = {
  weekend_trip: "Выезд на выходные",
  technical_ride: "Техническая покатушка",
  meeting: "Встреча",
  training: "Тренировка",
  service_day: "Сервис-день",
  other: "Другое",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface EventsTableProps {
  events: Event[];
}

export function EventsTable({ events }: EventsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedEvents = useMemo(() => {
    const copy = [...events];
    copy.sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";
      switch (sortKey) {
        case "title":
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
          break;
        case "category":
          valA = a.category || "";
          valB = b.category || "";
          break;
        case "created":
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
          break;
        case "date":
        default:
          valA = new Date(a.dateTime).getTime();
          valB = new Date(b.dateTime).getTime();
          break;
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [events, sortDir, sortKey]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-muted-foreground">Сортировать по:</div>
        <Select value={sortKey} onValueChange={(val) => setSortKey(val as SortKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Дате</SelectItem>
            <SelectItem value="created">Дате создания</SelectItem>
            <SelectItem value="title">Названию</SelectItem>
            <SelectItem value="category">Категории</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
        >
          {sortDir === "asc" ? "↑ Возрастание" : "↓ Убывание"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-4 py-2 font-semibold">Название</th>
              <th className="px-4 py-2 font-semibold">Дата и время</th>
              <th className="px-4 py-2 font-semibold">Создан</th>
              <th className="px-4 py-2 font-semibold">Категория</th>
              <th className="px-4 py-2 font-semibold">Локация</th>
              <th className="px-4 py-2 font-semibold">Лимит</th>
              <th className="px-4 py-2 font-semibold">Обновлено</th>
              <th className="px-4 py-2 font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedEvents.map((event) => (
              <tr key={event.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{event.title}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(event.dateTime)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(event.createdAt).toLocaleDateString("ru-RU")}
                </td>
                <td className="px-4 py-3">
                  {event.category ? CATEGORY_LABELS[event.category] : "—"}
                </td>
                <td className="px-4 py-3">{event.locationText || "—"}</td>
                <td className="px-4 py-3">
                  {event.maxParticipants ? `До ${event.maxParticipants}` : "Не ограничено"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(event.updatedAt).toLocaleDateString("ru-RU")}
                </td>
                <td className="px-4 py-3">
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/events/${event.id}`}>Открыть</Link>
                  </Button>
                </td>
              </tr>
            ))}
            {sortedEvents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Пока нет ивентов.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
