/**
 * EventClubSection - Club selection for club events
 * 
 * SSOT §4: Implements checkbox + single dropdown for club selection
 * - Checkbox: "Создать событие от клуба" (shown only if user has owner/admin in any club)
 * - Dropdown: Single club select (clubs where role ∈ {owner, admin})
 * - Auto-select: If exactly 1 club → auto-select
 * - Validation: clubId required when checkbox ON
 * 
 * Design: Follows DESIGN_SYSTEM.md Card pattern with shadcn/ui components
 * 
 * Architecture:
 * - UI state: isClubEventMode (controls checkbox, managed by parent form)
 * - Data state: clubId (source of truth for API payload, SSOT §1.2)
 * - When checkbox ON + multiple clubs → isClubEventMode=true, clubId=null (user must choose)
 * - Validation: clubId is required when isClubEventMode=true (validated in parent)
 */

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { useEffect } from "react";

interface ClubOption {
  id: string;
  name: string;
  userRole: "owner" | "admin";
}

interface EventClubSectionProps {
  // Form values
  clubId: string | null;
  onClubIdChange: (clubId: string | null) => void;
  isClubEventMode: boolean;
  onIsClubEventModeChange: (value: boolean) => void;
  
  // External data
  manageableClubs: ClubOption[];
  
  // Validation
  fieldError?: string;
  clearFieldError?: () => void;
  
  // UI state
  disabled?: boolean;
  mode?: "create" | "edit";
}

export function EventClubSection({
  clubId,
  onClubIdChange,
  isClubEventMode,
  onIsClubEventModeChange,
  manageableClubs,
  fieldError,
  clearFieldError,
  disabled,
  mode = "create",
}: EventClubSectionProps) {
  // SSOT §4.2: Auto-select if exactly one manageable club (create mode only)
  useEffect(() => {
    if (mode === "create" && manageableClubs.length === 1 && isClubEventMode && !clubId) {
      onClubIdChange(manageableClubs[0].id);
    }
  }, [manageableClubs, isClubEventMode, clubId, onClubIdChange, mode]);
  
  // Edit mode: show read-only club info
  if (mode === "edit" && clubId) {
    const selectedClub = manageableClubs.find((c) => c.id === clubId);
    
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-gray-50 p-4">
          <div className="flex h-5 w-5 items-center justify-center rounded border-2 border-[var(--color-primary)] bg-[var(--color-primary)]">
            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-text)]">
              Событие создано от клуба
            </p>
            {selectedClub && (
              <p className="mt-1 text-base font-semibold text-[var(--color-primary)]">
                {selectedClub.name}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Принадлежность к клубу нельзя изменить после создания события
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Create mode: interactive checkbox + dropdown
  return (
    <div className="space-y-4">
      {/* Checkbox: "Создать событие от клуба" */}
      <div className="flex items-center gap-3">
        <Checkbox
          id="isClubEvent"
          checked={isClubEventMode}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const checked = e.target.checked;
            onIsClubEventModeChange(checked);
            
            if (checked) {
              // Turning ON: auto-select if single club, else leave clubId=null (dropdown will require selection)
              if (manageableClubs.length === 1) {
                onClubIdChange(manageableClubs[0].id);
              }
              // else: clubId stays null, dropdown will show with validation
            } else {
              // Turning OFF: clear clubId
              onClubIdChange(null);
            }
            if (clearFieldError) clearFieldError();
          }}
          disabled={disabled}
        />
        <Label
          htmlFor="isClubEvent"
          className="text-base font-medium text-[var(--color-text)] cursor-pointer"
        >
          Создать событие от клуба
        </Label>
      </div>
      
      {/* Dropdown: Club selection (shown only when checkbox ON) */}
      {isClubEventMode && (
        <FormField
          id="clubId"
          label="Выберите клуб"
          required
          error={fieldError}
        >
          <Select
            value={clubId || ""}
            onValueChange={(value) => {
              onClubIdChange(value || null);
              if (clearFieldError) clearFieldError();
            }}
            disabled={disabled}
          >
            <SelectTrigger id="clubId" className={fieldError ? "border-red-500" : ""}>
              <SelectValue placeholder="Выберите клуб..." />
            </SelectTrigger>
            <SelectContent>
              {manageableClubs.map((club) => (
                <SelectItem key={club.id} value={club.id}>
                  {club.name} ({club.userRole === "owner" ? "Владелец" : "Администратор"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}
      
      {/* Helper text */}
      {isClubEventMode && (
        <p className="text-sm text-muted-foreground">
          Событие будет опубликовано от имени клуба. Лимиты участников и возможность платных событий определяются тарифным планом клуба.
        </p>
      )}
    </div>
  );
}

