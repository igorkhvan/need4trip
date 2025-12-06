"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Event, EventCategory } from "@/lib/types/event";

type EventRow = {
  id: string;
  title: string;
  startsAt: string;
  typeLabel?: string | null;
  ownerName?: string | null;
  ownerHandle?: string | null;
  participantsCount: number;
  category?: EventCategory | null;
  isPaid?: boolean;
  isClub?: boolean;
  price?: number | null;
  currency?: string | null;
};

type SortField = "title" | "startsAt" | "ownerName" | "typeLabel";
type SortDirection = "asc" | "desc";

const CATEGORY_LABELS: Record<EventCategory, string> = {
  weekend_trip: "Выезд на выходные",
  technical_ride: "Техническая покатушка",
  meeting: "Встреча",
  training: "Тренировка",
  service_day: "Сервис-день",
  other: "Другое",
};

function formatEventDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapEvents(events: Event[]): EventRow[] {
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    startsAt: e.dateTime,
    typeLabel: e.category ? CATEGORY_LABELS[e.category] : "Ивент",
    category: e.category ?? null,
    ownerName: e.ownerName ?? null,
    ownerHandle: e.ownerHandle ?? null,
    participantsCount: e.participantsCount ?? 0,
    isPaid: e.isPaid ?? false,
    isClub: e.isClubEvent ?? false,
    price: e.price ?? null,
    currency: e.currency ?? null,
  }));
}

interface EventsTableProps {
  events: Event[];
}

export function EventsTable({ events }: EventsTableProps) {
  const router = useRouter();
  const [sort, setSort] = useState<{ field: SortField; direction: SortDirection }>({
    field: "startsAt",
    direction: "asc",
  });
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | "all">("all");

  const rows = useMemo(() => mapEvents(events), [events]);

  const filtered = useMemo(
    () =>
      rows.filter((row) =>
        categoryFilter === "all" ? true : row.category === categoryFilter
      ),
    [rows, categoryFilter]
  );

  const sorted = useMemo(() => {
    const { field, direction } = sort;
    return [...filtered].sort((a, b) => {
      const aVal = a[field] ?? "";
      const bVal = b[field] ?? "";
      if (field === "startsAt") {
        const aTime = new Date(String(aVal)).getTime();
        const bTime = new Date(String(bVal)).getTime();
        return direction === "asc" ? aTime - bTime : bTime - aTime;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return direction === "asc" ? -1 : 1;
      if (aStr > bStr) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sort]);

  const toggleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { field, direction: "asc" };
    });
  };

  const sortIcon = (field: SortField) => {
    if (sort.field !== field) return null;
    return sort.direction === "asc" ? "↑" : "↓";
  };

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F7F7F8] px-6 py-10 text-center">
        <p className="text-base font-medium text-[#111827]">Пока нет ни одного ивента</p>
        <p className="mt-2 text-sm text-[#6B7280]">Создайте первый выезд и пригласите экипажи</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(val) => setCategoryFilter(val as EventCategory | "all")}
          >
            <SelectTrigger className="h-11 w-52 rounded-xl border-2">
              <SelectValue placeholder="Тип ивента" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((category) => (
                <SelectItem key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={`${sort.field}:${sort.direction}`}
            onValueChange={(val) => {
              const [field, direction] = val.split(":") as [SortField, SortDirection];
              setSort({ field, direction });
            }}
          >
            <SelectTrigger className="h-11 w-52 rounded-xl border-2">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="startsAt:asc">По дате (ближайшие сверху)</SelectItem>
              <SelectItem value="startsAt:desc">По дате (самые поздние)</SelectItem>
              <SelectItem value="title:asc">По названию (А-Я)</SelectItem>
              <SelectItem value="title:desc">По названию (Я-А)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-[#6B7280]">
          Найдено ивентов: <span className="font-medium text-[#111827]">{sorted.length}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-[#F7F7F8]">
            <TableRow>
              <TableHead
                onClick={() => toggleSort("title")}
                className="cursor-pointer select-none px-4 py-3 text-[#111827]"
              >
                Название {sortIcon("title")}
              </TableHead>
              <TableHead
                onClick={() => toggleSort("startsAt")}
                className="cursor-pointer select-none px-4 py-3 text-[#111827]"
              >
                Дата и время {sortIcon("startsAt")}
              </TableHead>
              <TableHead
                onClick={() => toggleSort("typeLabel")}
                className="cursor-pointer select-none px-4 py-3 text-[#111827]"
              >
                Тип {sortIcon("typeLabel")}
              </TableHead>
              <TableHead
                onClick={() => toggleSort("ownerName")}
                className="cursor-pointer select-none px-4 py-3 text-[#111827]"
              >
                Организатор {sortIcon("ownerName")}
              </TableHead>
              <TableHead className="px-4 py-3 text-right text-[#111827]">Участники</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((event) => {
              const priceLabel =
                event.isPaid && event.price
                  ? `${event.price} ${event.currency ?? ""}`.trim()
                  : event.isPaid
                    ? "Платное"
                    : "Бесплатно";
              return (
                <TableRow
                  key={event.id}
                  className="cursor-pointer transition-colors hover:bg-[#F7F7F8]"
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/events/${event.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/events/${event.id}`);
                    }
                  }}
                >
                  <TableCell className="min-w-[180px] px-4 py-3 align-top">
                    <div className="space-y-2">
                      <div className="text-base font-semibold text-[#111827]">{event.title}</div>
                      <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#6B7280]">
                        <span>{event.typeLabel ?? "Ивент"}</span>
                        <span className="text-[#D1D5DB]">•</span>
                        <span>{event.ownerHandle ? `@${event.ownerHandle}` : event.ownerName ?? "—"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {event.isClub && (
                          <span className="rounded-full bg-[#F0FDF4] px-3 py-1 text-[13px] font-medium text-[#16A34A]">
                            Клубное
                          </span>
                        )}
                        <span
                          className={`rounded-full px-3 py-1 text-[13px] font-medium ${
                            event.isPaid
                              ? "bg-[#FFF4EF] text-[#E86223]"
                              : "bg-[#E5E7EB] text-[#374151]"
                          }`}
                        >
                          {priceLabel}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top text-[#111827]">
                    <div className="text-sm font-medium">{formatEventDateTime(event.startsAt)}</div>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top text-[#6B7280]">
                    {event.typeLabel ?? "Ивент"}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top text-[#6B7280]">
                    {event.ownerHandle ? `@${event.ownerHandle}` : event.ownerName ?? "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right align-top text-[#111827]">
                    {event.participantsCount}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
