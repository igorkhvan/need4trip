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
import { Event, EventCategory } from "@/lib/types/event";

type EventRow = {
  id: string;
  title: string;
  startsAt: string;
  typeLabel?: string | null;
  ownerName?: string | null;
  participantsCount: number;
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
    ownerName: null, // backend does not provide owner user; keeping placeholder
    participantsCount: 0,
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

  const rows = useMemo(() => mapEvents(events), [events]);

  const sorted = useMemo(() => {
    const { field, direction } = sort;
    return [...rows].sort((a, b) => {
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
  }, [rows, sort]);

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
      <p className="text-sm text-muted-foreground">
        Пока нет ни одного ивента. Создайте первый выезд.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              onClick={() => toggleSort("title")}
              className="cursor-pointer select-none"
            >
              Название {sortIcon("title")}
            </TableHead>
            <TableHead
              onClick={() => toggleSort("startsAt")}
              className="cursor-pointer select-none"
            >
              Дата и время {sortIcon("startsAt")}
            </TableHead>
            <TableHead
              onClick={() => toggleSort("typeLabel")}
              className="cursor-pointer select-none"
            >
              Тип {sortIcon("typeLabel")}
            </TableHead>
            <TableHead
              onClick={() => toggleSort("ownerName")}
              className="cursor-pointer select-none"
            >
              Организатор {sortIcon("ownerName")}
            </TableHead>
            <TableHead className="text-right">Участники</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((event) => (
            <TableRow
              key={event.id}
              className="cursor-pointer hover:bg-muted/50"
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
              <TableCell className="font-medium">{event.title}</TableCell>
              <TableCell>{formatEventDateTime(event.startsAt)}</TableCell>
              <TableCell>{event.typeLabel ?? "Ивент"}</TableCell>
              <TableCell>{event.ownerName ?? "—"}</TableCell>
              <TableCell className="text-right">{event.participantsCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
