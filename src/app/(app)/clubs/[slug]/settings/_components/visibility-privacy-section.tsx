"use client";

/**
 * Visibility & Privacy Section (Phase 7)
 * 
 * Per SSOT_CLUBS_DOMAIN.md:
 * - §4: Club visibility (public / private)
 * - §5.4: Open Join (settings.openJoinEnabled)
 * - §8.1: Owner-only visibility and settings changes
 * - §8.3: Archived club — read-only
 * 
 * Per SSOT_API.md API-017:
 * - PATCH /api/clubs/[id] with visibility and settings
 * - settings object is MERGED server-side
 * 
 * UI Contract:
 * - Explicit Save button (no auto-save)
 * - Button disabled unless changes exist
 * - Shows backend error as-is
 */

import { useState, useCallback } from "react";
import { Eye, AlertTriangle, Archive, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ClubVisibility } from "@/lib/types/club";

interface VisibilityPrivacySectionProps {
  clubId: string;
  initialVisibility: ClubVisibility;
  initialOpenJoinEnabled: boolean;
  isArchived: boolean;
}

export function VisibilityPrivacySection({
  clubId,
  initialVisibility,
  initialOpenJoinEnabled,
  isArchived,
}: VisibilityPrivacySectionProps) {
  // Local state for form values
  const [visibility, setVisibility] = useState<ClubVisibility>(initialVisibility);
  const [openJoinEnabled, setOpenJoinEnabled] = useState(initialOpenJoinEnabled);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if any value has changed
  const hasChanges = 
    visibility !== initialVisibility || 
    openJoinEnabled !== initialOpenJoinEnabled;

  // Handle save
  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) return;
    
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Build payload with ONLY changed fields
      const payload: Record<string, unknown> = {};
      
      if (visibility !== initialVisibility) {
        payload.visibility = visibility;
      }
      
      if (openJoinEnabled !== initialOpenJoinEnabled) {
        payload.settings = {
          openJoinEnabled: openJoinEnabled,
        };
      }

      const response = await fetch(`/api/clubs/${clubId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || 
          errorData?.message || 
          `Ошибка сохранения (${response.status})`;
        throw new Error(errorMessage);
      }

      setSuccessMessage("Настройки сохранены");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  }, [clubId, visibility, openJoinEnabled, initialVisibility, initialOpenJoinEnabled, hasChanges, isSaving]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Видимость и приватность
        </CardTitle>
        <CardDescription>
          Настройки видимости клуба и политики вступления
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Archived club notice */}
        {isArchived && (
          <div className="p-3 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]">
            <div className="flex items-start gap-3">
              <Archive className="w-5 h-5 text-[var(--color-warning)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--color-warning-text)]">
                Клуб находится в архиве. Настройки доступны только для просмотра.
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--color-danger)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--color-danger-text)]">{error}</p>
            </div>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="p-3 rounded-lg bg-[var(--color-success-bg)] border border-[var(--color-success-border)]">
            <p className="text-sm text-[var(--color-success)]">{successMessage}</p>
          </div>
        )}

        {/* 1. Club Visibility */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-[var(--color-text)]">
            Видимость клуба
          </Label>
          <div className="space-y-2">
            <label 
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                visibility === "public" 
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]" 
                  : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
              } ${isArchived ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}
                disabled={isArchived}
                className="w-4 h-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  Публичный
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Клуб виден в каталоге и поиске
                </p>
              </div>
            </label>

            <label 
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                visibility === "private" 
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]" 
                  : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
              } ${isArchived ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === "private"}
                onChange={() => setVisibility("private")}
                disabled={isArchived}
                className="w-4 h-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  Приватный
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Клуб не отображается в каталоге и поиске
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* 2. Join Policy */}
        <div className="space-y-3 border-t border-[var(--color-border)] pt-6">
          <Label className="text-sm font-medium text-[var(--color-text)]">
            Политика вступления
          </Label>
          <div className="space-y-2">
            <label 
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                openJoinEnabled 
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]" 
                  : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
              } ${isArchived ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <input
                type="radio"
                name="joinPolicy"
                value="open"
                checked={openJoinEnabled}
                onChange={() => setOpenJoinEnabled(true)}
                disabled={isArchived}
                className="w-4 h-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  Открытое вступление
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Любой пользователь может вступить в клуб
                </p>
              </div>
            </label>

            <label 
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                !openJoinEnabled 
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]" 
                  : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
              } ${isArchived ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <input
                type="radio"
                name="joinPolicy"
                value="request"
                checked={!openJoinEnabled}
                onChange={() => setOpenJoinEnabled(false)}
                disabled={isArchived}
                className="w-4 h-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">
                  По заявке
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Заявки на вступление требуют одобрения
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Save button */}
        {!isArchived && (
          <div className="flex justify-end border-t border-[var(--color-border)] pt-6">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить изменения"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
