/**
 * Multi-Brand Select Component - Wrapper around GenericSelect
 * 
 * Multi-select dropdown for selecting multiple car brands
 * Used in event form for allowed brands
 * 
 * Features:
 * - Static data with client-side filtering
 * - Multiple selection with badges in button
 * - Alphabetical sorting
 * - Optional label
 * 
 * Architecture:
 * - Thin wrapper around GenericSelect
 * - Maintains exact same API as before (zero breaking changes)
 */

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { GenericSelect } from "@/components/ui/generic-select";

export interface MultiBrandSelectOption {
  id: string;
  name: string;
}

interface MultiBrandSelectProps {
  label?: string;
  placeholder?: string;
  options: MultiBrandSelectOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  disabled?: boolean;
}

export function MultiBrandSelect({
  label,
  placeholder = "Выберите марку...",
  options,
  value,
  onChange,
  error,
  disabled = false,
}: MultiBrandSelectProps) {
  // Sort options alphabetically
  const sortedOptions = useMemo(
    () =>
      [...options].sort((a, b) =>
        a.name.localeCompare(b.name, "ru-RU", { sensitivity: "base" })
      ),
    [options]
  );
  
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      
      <GenericSelect<MultiBrandSelectOption>
        mode="multi"
        value={value}
        onChange={(val) => onChange(Array.isArray(val) ? val : [])}
        
        items={sortedOptions}
        
        getItemId={(brand) => brand.id}
        getItemLabel={(brand) => brand.name}
        
        placeholder={placeholder}
        searchPlaceholder="Поиск марки..."
        emptyMessage="Не найдено"
        
        disabled={disabled}
        error={!!error}
        errorMessage={error}
        
        shouldFilter={true}  // Client-side filtering
        badgesPosition="inside"
        popoverContentClassName="w-[min(420px,calc(100vw-2rem))]"
        popoverAlign="start"
        popoverSideOffset={6}
      />
    </div>
  );
}
