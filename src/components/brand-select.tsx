/**
 * Brand Select Component - Wrapper around GenericSelect
 * 
 * Static dropdown for selecting car brands from provided options
 * 
 * Features:
 * - Client-side filtering/search
 * - Alphabetical sorting
 * - Static data (no API calls)
 * 
 * Architecture:
 * - Thin wrapper around GenericSelect
 * - Maintains exact same API as before (zero breaking changes)
 */

import { useMemo } from "react";
import { GenericSelect } from "@/components/ui/generic-select";

export interface BrandSelectOption {
  id: string;
  name: string;
}

interface BrandSelectProps {
  placeholder?: string;
  options: BrandSelectOption[];
  value: string;
  onChange: (id: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export function BrandSelect({
  placeholder = "Выберите марку...",
  options,
  value,
  onChange,
  error = false,
  disabled = false,
}: BrandSelectProps) {
  // Sort options alphabetically
  const sortedOptions = useMemo(
    () =>
      [...options].sort((a, b) =>
        a.name.localeCompare(b.name, "ru-RU", { sensitivity: "base" })
      ),
    [options]
  );
  
  return (
    <GenericSelect<BrandSelectOption>
      mode="single"
      value={value}
      onChange={(val) => onChange(val as string)}
      
      items={sortedOptions}
      
      getItemId={(brand) => brand.id}
      getItemLabel={(brand) => brand.name}
      
      placeholder={placeholder}
      searchPlaceholder="Поиск марки..."
      emptyMessage="Не найдено"
      
      disabled={disabled}
      error={error}
      
      shouldFilter={true}  // Client-side filtering
      popoverContentClassName="w-[min(420px,calc(100vw-2rem))]"
      popoverAlign="start"
      popoverSideOffset={6}
    />
  );
}
