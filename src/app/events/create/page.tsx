"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  EventCategory,
  EventCustomFieldSchema,
  EventCustomFieldType,
} from "@/lib/types/event";

const CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = [
  { value: "weekend_trip", label: "Выезд на выходные" },
  { value: "technical_ride", label: "Техническая покатушка" },
  { value: "meeting", label: "Встреча" },
  { value: "training", label: "Тренировка" },
  { value: "service_day", label: "Сервис-день" },
  { value: "other", label: "Другое" },
];

const FIELD_TYPE_OPTIONS: { value: EventCustomFieldType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "number", label: "Число" },
  { value: "boolean", label: "Да / Нет" },
  { value: "enum", label: "Список значений" },
];

function buildEmptyField(order: number): EventCustomFieldSchema {
  return {
    id: `field-${crypto.randomUUID().slice(0, 8)}`,
    label: "",
    type: "text",
    required: false,
    order,
    options: [],
  };
}

export default function CreateEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<EventCustomFieldSchema[]>([]);

  const sortedFields = useMemo(
    () => [...customFields].sort((a, b) => a.order - b.order),
    [customFields]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    const dateTime = formData.get("dateTime") as string;
    const maxParticipants = formData.get("maxParticipants") as string;
    const title = (formData.get("title") as string)?.trim() ?? "";
    const description = (formData.get("description") as string)?.trim() ?? "";

    const issues: Record<string, string> = {};

    const hasEmptyEnumOptions = sortedFields.some(
      (field) => field.type === "enum" && (!field.options || field.options.length === 0)
    );
    if (hasEmptyEnumOptions) {
      setErrorMessage("Для полей типа список нужно указать варианты через запятую.");
      return;
    }

    if (title.length < 3) {
      setErrorMessage("Название должно быть от 3 символов.");
      return;
    }
    if (description.length < 1) {
      setErrorMessage("Описание не может быть пустым.");
      return;
    }

    sortedFields.forEach((field, idx) => {
      if (!field.label.trim()) {
        issues[`customFieldsSchema.${idx}.label`] = "Введите название поля";
      }
      if (field.type === "enum" && (!field.options || field.options.length === 0)) {
        issues[`customFieldsSchema.${idx}.options`] = "Укажите варианты для списка";
      }
    });

    if (Object.keys(issues).length) {
      setFieldErrors(issues);
      return;
    }

    const payload = {
      title,
      description,
      category: (formData.get("category") as EventCategory | null) ?? null,
      dateTime: dateTime ? new Date(dateTime).toISOString() : new Date().toISOString(),
      locationText: (formData.get("locationText") as string) ?? "",
      locationLat: null,
      locationLng: null,
      maxParticipants: maxParticipants ? Number(maxParticipants) : null,
      customFieldsSchema: sortedFields,
    };

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          setErrorMessage("Недостаточно прав / требуется DEV_USER_ID");
          return;
        }
        if (res.status === 409) {
          setErrorMessage("Лимит участников достигнут");
          return;
        }
        const issues: Record<string, string> = {};
        const rawIssues = body?.details?.issues || body?.issues;
        if (Array.isArray(rawIssues)) {
          rawIssues.forEach((issue: unknown) => {
            const it = issue as { path?: unknown; message?: string };
            const path = Array.isArray(it?.path) ? (it.path as string[]).join(".") : "";
            if (path) issues[path] = it?.message || "Ошибка валидации";
          });
        }
        const fe = body?.details?.fieldErrors;
        if (fe && typeof fe === "object") {
          Object.entries(fe as Record<string, string[]>).forEach(([k, v]) => {
            if (v && v.length) issues[k] = v.join(", ");
          });
        }
        if (Object.keys(issues).length) {
          setFieldErrors(issues);
          setErrorMessage(null);
        }
        const stringifyDetails = (d: unknown) => {
          if (!d) return "";
          if (typeof d === "string") return d;
          if (typeof d === "object") {
            if ("fieldErrors" in (d as Record<string, unknown>)) {
              const fe = (d as { fieldErrors?: Record<string, string[]> }).fieldErrors;
              if (fe) {
                return Object.entries(fe)
                  .map(([key, msgs]) => `${key}: ${(msgs || []).join(", ")}`)
                  .join("; ");
              }
            }
            return JSON.stringify(d);
          }
          return String(d);
        };
        const details =
          stringifyDetails(body?.details) ||
          stringifyDetails(body?.message) ||
          stringifyDetails(body);
        if (!Object.keys(issues).length) {
          throw new Error(
            body?.error
              ? `${body.error}${details ? `: ${details}` : ""}`
              : details || "Не удалось создать ивент"
          );
        }
        return;
      }
      router.push("/events");
    } catch (error) {
      console.error("Error creating event", error);
      setErrorMessage(
        error instanceof Error
          ? error.message || "Не удалось создать ивент"
          : "Не удалось создать ивент"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (
    id: string,
    patch: Partial<EventCustomFieldSchema>
  ) => {
    setCustomFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, ...patch } : field))
    );
  };

  const addField = () => {
    setCustomFields((prev) => [...prev, buildEmptyField(prev.length + 1)]);
  };

  const removeField = (id: string) => {
    setCustomFields((prev) => prev.filter((field) => field.id !== id));
  };

  const fieldError = (path: string) => fieldErrors[path];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Создание ивента</h1>
          <p className="text-muted-foreground">
            Опишите покатушку, добавьте кастомные поля для регистрации экипажей.
          </p>
        </div>
      </div>

      <TooltipProvider>
        <Card>
          <CardHeader>
            <CardTitle>Основные данные</CardTitle>
            <CardDescription>На этом шаге поля не валидируются строго.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Название</Label>
                  <Tooltip open={Boolean(fieldError("title"))} disableHoverableContent>
                    <TooltipTrigger asChild>
                      <Input
                        id="title"
                        name="title"
                        placeholder="Выезд в Лахта"
                        required
                        className={
                          fieldError("title") ? "border-red-500 focus-visible:ring-red-500" : ""
                        }
                        onChange={() => {
                          if (fieldError("title")) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.title;
                              return next;
                            });
                          }
                          setErrorMessage(null);
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">{fieldError("title")}</TooltipContent>
                  </Tooltip>
                  {fieldError("title") && (
                    <div className="text-xs text-red-600">{fieldError("title")}</div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Категория</Label>
                  <Select name="category" defaultValue="weekend_trip">
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTime">Дата и время</Label>
                  <Input id="dateTime" name="dateTime" type="datetime-local" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Макс. экипажей</Label>
                  <Input
                    id="maxParticipants"
                    name="maxParticipants"
                    type="number"
                    min={1}
                    placeholder="Необязательное поле"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationText">Локация (текстом)</Label>
                <Tooltip open={Boolean(fieldError("locationText"))} disableHoverableContent>
                  <TooltipTrigger asChild>
                    <Input
                      id="locationText"
                      name="locationText"
                      placeholder="Например: карьер у реки, GPS точку добавим позже"
                      required
                      className={
                        fieldError("locationText")
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                      onChange={() => {
                        if (fieldError("locationText")) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.locationText;
                            return next;
                          });
                        }
                        setErrorMessage(null);
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">{fieldError("locationText")}</TooltipContent>
                </Tooltip>
                {fieldError("locationText") && (
                  <div className="text-xs text-red-600">{fieldError("locationText")}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание ивента</Label>
                <Tooltip open={Boolean(fieldError("description"))} disableHoverableContent>
                  <TooltipTrigger asChild>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Кратко опишите маршрут, требования к технике и прочее"
                      rows={4}
                      className={
                        fieldError("description")
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                      onChange={() => {
                        if (fieldError("description")) {
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next.description;
                            return next;
                          });
                        }
                        setErrorMessage(null);
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">{fieldError("description")}</TooltipContent>
                </Tooltip>
                {fieldError("description") && (
                  <div className="text-xs text-red-600">{fieldError("description")}</div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-end gap-2 border-t bg-muted/30">
              {errorMessage && (
                <div className="mr-auto text-sm text-red-600">{errorMessage}</div>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Создаём..." : "Сохранить ивент"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TooltipProvider>

      <TooltipProvider>
        <Card>
          <CardHeader>
            <CardTitle>Кастомные поля регистрации</CardTitle>
            <CardDescription>
              Моковый конструктор: добавьте чекбоксы, числа или списки для участников.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedFields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-lg border bg-background px-4 py-3 md:grid-cols-4 md:items-center"
              >
                <div className="space-y-1 md:col-span-2">
                  <Label>Метка</Label>
                  <Tooltip
                    open={Boolean(fieldError(`customFieldsSchema.${index}.label`))}
                    disableHoverableContent
                  >
                    <TooltipTrigger asChild>
                      <Input
                        value={field.label}
                        placeholder="Название поля"
                        className={
                          fieldError(`customFieldsSchema.${index}.label`)
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }
                        onChange={(e) => {
                          updateField(field.id, { label: e.target.value });
                          if (fieldError(`customFieldsSchema.${index}.label`)) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next[`customFieldsSchema.${index}.label`];
                              return next;
                            });
                          }
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {fieldError(`customFieldsSchema.${index}.label`)}
                    </TooltipContent>
                  </Tooltip>
                  {fieldError(`customFieldsSchema.${index}.label`) && (
                    <div className="text-xs text-red-600">
                      {fieldError(`customFieldsSchema.${index}.label`)}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Тип</Label>
                  <Select
                    value={field.type}
                    onValueChange={(value) =>
                      updateField(field.id, { type: value as EventCustomFieldType })
                    }
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
                </div>
                <div className="space-y-1">
                  <Label>Обязательное</Label>
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={field.required}
                      onChange={(e) =>
                        updateField(field.id, { required: e.target.checked })
                      }
                    />
                    <span className="text-sm text-muted-foreground">Да</span>
                  </div>
                </div>
                {field.type === "enum" && (
                  <div className="md:col-span-4">
                    <Label>Варианты (через запятую)</Label>
                    <Input
                      value={field.options?.join(", ") ?? ""}
                      onChange={(e) =>
                        updateField(field.id, {
                          options: e.target.value
                            .split(",")
                            .map((opt) => opt.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                )}
                <div className="flex items-center justify-between md:col-span-4">
                  <span className="text-xs text-muted-foreground">
                    Порядок: {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(field.id)}
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addField}>
              Добавить поле
            </Button>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
}
