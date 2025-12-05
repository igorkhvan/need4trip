"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { EventCustomFieldSchema } from "@/lib/types/event";

interface EditParticipationFormProps {
  eventId: string;
  participantId: string;
  customFields: EventCustomFieldSchema[];
  initialValues: Record<string, unknown>;
  displayName: string;
  isSelf: boolean;
  authMissing: boolean;
}

export function EditParticipationForm({
  eventId,
  participantId,
  customFields,
  initialValues,
  displayName,
  isSelf,
  authMissing,
}: EditParticipationFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, unknown>>(initialValues || {});
  const [name, setName] = useState(displayName);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSelf || authMissing) {
      setError("Недостаточно прав / войдите через Telegram");
      return;
    }
    setFieldErrors({});
    const trimmedName = name.trim();
    const issues: Record<string, string> = {};
    if (!trimmedName || trimmedName.length > 100) {
        issues.displayName = "Введите имя экипажа (до 100 символов).";
    }
    customFields.forEach((field) => {
      if (!field.required) return;
      const val = values[field.id];
      if (field.type === "number") {
        if (val === "" || val === null || val === undefined || Number.isNaN(Number(val))) {
          issues[field.id] = "Укажите значение";
        }
      } else if (field.type === "enum" || field.type === "text") {
        if (!val || String(val).trim().length === 0) {
          issues[field.id] = "Заполните поле";
        }
      } else if (field.type === "boolean") {
        if (val === undefined || val === null) {
          issues[field.id] = "Укажите значение";
        }
      }
    });
    if (Object.keys(issues).length) {
      setFieldErrors(issues);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmedName, customFieldValues: values }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Недостаточно прав / войдите через Telegram");
        } else if (res.status === 400) {
          const body = await res.json().catch(() => ({}));
          setError(body?.message || "Ошибка валидации");
        } else if (res.status === 409) {
          setError("Лимит участников достигнут");
        } else {
          const body = await res.json().catch(() => ({}));
          setError(body?.message || "Не удалось сохранить регистрацию");
        }
        return;
      }
      toast({ title: "Обновлено", description: "Регистрация успешно сохранена" });
      router.push(`/events/${eventId}#register`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Произошла ошибка. Повторите попытку."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: EventCustomFieldSchema) => {
    const commonLabel = (
      <Label className="flex items-center gap-2">
        {field.label}
        {field.required && <span className="text-red-600">*</span>}
      </Label>
    );
    const value = values[field.id];
    const errorText = fieldErrors[field.id];

    const updateValue = (val: unknown) => {
      setValues((prev) => ({
        ...prev,
        [field.id]: val,
      }));
      setFieldErrors((prev) => {
        if (!prev[field.id]) return prev;
        const next = { ...prev };
        delete next[field.id];
        return next;
      });
    };

    switch (field.type) {
      case "number":
        return (
          <div className="space-y-1" key={field.id}>
            {commonLabel}
            <Input
              type="number"
              value={
                typeof value === "number"
                  ? value
                  : typeof value === "string" && value.trim() !== ""
                    ? Number(value)
                    : ""
              }
              className={errorText ? "border-red-500 focus-visible:ring-red-500" : ""}
              onChange={(e) => updateValue(e.target.value === "" ? null : Number(e.target.value))}
            />
            <div className="min-h-[16px] text-xs text-red-600">{errorText ?? ""}</div>
          </div>
        );
      case "boolean":
        return (
          <div
            className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
            key={field.id}
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={Boolean(value)}
              onChange={(e) => updateValue(e.target.checked)}
            />
            <Label className="text-sm">{field.label}</Label>
          </div>
        );
      case "enum":
        return (
          <div className="space-y-1" key={field.id}>
            {commonLabel}
            <Select
              value={(value as string) ?? ""}
              onValueChange={(val) => updateValue(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите значение" />
              </SelectTrigger>
              <SelectContent>
                {(field.options || []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="min-h-[16px] text-xs text-red-600">{errorText ?? ""}</div>
          </div>
        );
      default:
        return (
          <div className="space-y-1" key={field.id}>
            {commonLabel}
            <Input
              value={(value as string) ?? ""}
              className={errorText ? "border-red-500 focus-visible:ring-red-500" : ""}
              onChange={(e) => updateValue(e.target.value)}
            />
            <div className="min-h-[16px] text-xs text-red-600">{errorText ?? ""}</div>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Регистрация</p>
        <h1 className="text-3xl font-bold tracking-tight">Редактирование регистрации</h1>
        <p className="text-sm text-muted-foreground">
          Обновите имя экипажа и ответы на кастомные поля.
        </p>
        <p className="text-sm text-muted-foreground">
          Обновите имя экипажа и данные для организатора.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/events/${eventId}#register`}>← Назад к участникам</Link>
          </Button>
        </div>
      </div>

      {authMissing && (
        <Alert>
          <AlertTitle>Требуется авторизация</AlertTitle>
          <AlertDescription>Войдите через Telegram, чтобы редактировать регистрацию.</AlertDescription>
        </Alert>
      )}
      {!isSelf && (
        <Alert variant="destructive">
          <AlertTitle>Нет прав</AlertTitle>
          <AlertDescription>Только владелец регистрации может её изменять.</AlertDescription>
        </Alert>
      )}

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Данные экипажа</CardTitle>
            <CardDescription>Обновите отображаемое имя и ответы.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
          <Label htmlFor="displayName">Имя экипажа</Label>
          <Input
            id="displayName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={authMissing || !isSelf}
          />
          <div className="min-h-[16px] text-xs text-red-600">
            {fieldErrors.displayName ?? ""}
          </div>
        </div>
            {customFields.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {customFields.map((field) => renderField(field))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2 border-t bg-background px-4 py-3">
            <div className="mr-auto min-h-[20px] text-sm text-red-600">{error ?? ""}</div>
            <Button type="submit" disabled={isSubmitting || authMissing || !isSelf}>
              {isSubmitting ? "Сохраняем..." : "Сохранить"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
