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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSelf || authMissing) {
      setError("Недостаточно прав / требуется DEV_USER_ID");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/participants/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name.trim(), customFieldValues: values }),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Недостаточно прав / требуется DEV_USER_ID");
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

    const updateValue = (val: unknown) =>
      setValues((prev) => ({
        ...prev,
        [field.id]: val,
      }));

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
              required={field.required}
              onChange={(e) => updateValue(e.target.value === "" ? null : Number(e.target.value))}
            />
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
              required={field.required}
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
          </div>
        );
      default:
        return (
          <div className="space-y-1" key={field.id}>
            {commonLabel}
            <Input
              value={(value as string) ?? ""}
              required={field.required}
              onChange={(e) => updateValue(e.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Редактирование регистрации</h1>
          <p className="text-muted-foreground">
            Можно изменить имя экипажа и ответы на кастомные поля.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/events/${eventId}#register`}>Назад</Link>
        </Button>
      </div>

      {authMissing && (
        <Alert variant="destructive">
          <AlertTitle>DEV_USER_ID не установлен</AlertTitle>
          <AlertDescription>Авторизация выключена — сохранение будет недоступно.</AlertDescription>
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
            <CardTitle>Данные экипажа</CardTitle>
            <CardDescription>Обновите отображаемое имя и ответы.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="displayName">Имя экипажа</Label>
              <Input
                id="displayName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={authMissing || !isSelf}
              />
            </div>
            {customFields.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {customFields.map((field) => renderField(field))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2 border-t bg-muted/30">
            {error && <div className="mr-auto text-sm text-red-600">{error}</div>}
            <Button type="submit" disabled={isSubmitting || authMissing || !isSelf}>
              {isSubmitting ? "Сохраняем..." : "Сохранить"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
