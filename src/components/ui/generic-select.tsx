/**
 * Generic Select Component - Unified select/combobox component
 * 
 * Supports:
 * - Single/Multi selection modes
 * - Static items or async data loading
 * - Search with debounce
 * - Custom rendering
 * - Type-safe with generics
 * 
 * Architecture:
 * - Base component with flexible configuration
 * - Used via wrapper components (CitySelect, BrandSelect, etc.)
 * - Zero breaking changes to existing API
 */

"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type SelectMode = "single" | "multi";

export interface GenericSelectProps<T> {
  // Mode
  mode: SelectMode;
  
  // Value & onChange (type depends on mode)
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  
  // Data source (one of these)
  items?: T[];  // Static items
  loadItems?: (query: string) => Promise<T[]>;  // Async search
  loadInitial?: () => Promise<T[]>;  // Initial async load
  loadById?: (id: string) => Promise<T | null>;  // Load single by ID
  
  // Item accessors (required)
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => string;
  
  // Custom rendering (optional)
  renderItem?: (item: T, isSelected: boolean) => React.ReactNode;
  renderTrigger?: (selectedItems: T[], placeholder: string) => React.ReactNode;
  
  // UI props
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  icon?: React.ReactNode;
  className?: string;
  
  // Behavior
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  maxItems?: number;  // For multi mode
  debounceMs?: number;  // For async search
  shouldFilter?: boolean;  // For Command component (client-side filtering)
  badgesPosition?: "inside" | "outside";  // For multi mode: where to show selected badges (default: "outside")
  
  // Popover props
  popoverContentClassName?: string;
  popoverAlign?: "start" | "center" | "end";
  popoverSideOffset?: number;
}

// ============================================================================
// Component
// ============================================================================

export function GenericSelect<T>({
  mode,
  value,
  onChange,
  items: staticItems,
  loadItems,
  loadInitial,
  loadById,
  getItemId,
  getItemLabel,
  renderItem,
  renderTrigger,
  placeholder = "Выберите...",
  searchPlaceholder = "Поиск...",
  emptyMessage = "Не найдено",
  loadingMessage = "Загрузка...",
  icon,
  className,
  disabled = false,
  error = false,
  errorMessage,
  maxItems,
  debounceMs = 300,
  shouldFilter = false,
  badgesPosition = "outside",
  popoverContentClassName,
  popoverAlign = "start",
  popoverSideOffset = 4,
}: GenericSelectProps<T>) {
  // ========================================================================
  // State
  // ========================================================================
  
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<T[]>(staticItems || []);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);
  
  // Normalize value to array for easier handling
  const valueArray = React.useMemo(() => {
    if (value === null) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);
  
  // Selected items
  const selectedItems = React.useMemo(() => {
    return items.filter(item => valueArray.includes(getItemId(item)));
  }, [items, valueArray, getItemId]);
  
  // ========================================================================
  // Data Loading
  // ========================================================================
  
  // Load initial data on mount (for async components)
  React.useEffect(() => {
    if (!loadInitial || staticItems) return;
    
    // Capture loadInitial to satisfy TypeScript closure
    const loader = loadInitial;
    
    async function load() {
      setLoading(true);
      try {
        const result = await loader();
        setItems(result);
      } catch (err) {
        console.error("[GenericSelect] Failed to load initial items", err);
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [loadInitial, staticItems]);
  
  // Load selected item by ID if not in list (for async components)
  React.useEffect(() => {
    if (!loadById || !value || Array.isArray(value)) return;
    if (mode !== "single") return;
    
    // Check if already loaded
    const exists = items.some(item => getItemId(item) === value);
    if (exists) return;
    
    async function load() {
      try {
        const item = await loadById!(value as string);
        if (item) {
          setItems(prev => [item, ...prev]);
        }
      } catch (err) {
        console.error("[GenericSelect] Failed to load item by ID", err);
      }
    }
    
    load();
  }, [value, items, loadById, getItemId, mode]);
  
  // Search items on query change (debounced)
  React.useEffect(() => {
    if (!loadItems) return;
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    if (!searchQuery.trim()) {
      // If query is empty, load initial items
      if (loadInitial) {
        setLoading(true);
        loadInitial()
          .then(setItems)
          .catch(err => console.error("[GenericSelect] Failed to load initial items", err))
          .finally(() => setLoading(false));
      }
      return;
    }
    
    // Store loadItems in a variable to satisfy TypeScript
    const loader = loadItems;
    
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await loader(searchQuery);
        setItems(result);
      } catch (err) {
        console.error("[GenericSelect] Failed to search items", err);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, loadItems, loadInitial, debounceMs]);
  
  // Update items when staticItems change
  React.useEffect(() => {
    if (staticItems) {
      setItems(staticItems);
    }
  }, [staticItems]);
  
  // ========================================================================
  // Handlers
  // ========================================================================
  
  const handleSelect = React.useCallback((item: T) => {
    if (disabled) return;
    
    const itemId = getItemId(item);
    
    if (mode === "single") {
      // Single mode: toggle or set
      const newValue = valueArray[0] === itemId ? null : itemId;
      onChange(newValue);
      setOpen(false);
    } else {
      // Multi mode: add or remove
      const isSelected = valueArray.includes(itemId);
      
      if (isSelected) {
        const newValue = valueArray.filter(id => id !== itemId);
        onChange(newValue);
      } else {
        // Check max items limit
        if (maxItems && valueArray.length >= maxItems) {
          return;
        }
        const newValue = [...valueArray, itemId];
        onChange(newValue);
      }
    }
  }, [mode, valueArray, onChange, getItemId, disabled, maxItems]);
  
  const handleRemove = React.useCallback((itemId: string) => {
    if (disabled) return;
    if (mode !== "multi") return;
    
    const newValue = valueArray.filter(id => id !== itemId);
    onChange(newValue);
  }, [mode, valueArray, onChange, disabled]);
  
  // ========================================================================
  // Rendering
  // ========================================================================
  
  // Default item renderer
  const defaultRenderItem = React.useCallback((item: T, isSelected: boolean) => {
    return (
      <>
        <Check
          className={cn(
            "mr-2 h-4 w-4",
            isSelected ? "opacity-100" : "opacity-0"
          )}
        />
        <span>{getItemLabel(item)}</span>
      </>
    );
  }, [getItemLabel]);
  
  // Default trigger renderer
  const defaultRenderTrigger = React.useCallback((selected: T[], ph: string) => {
    if (mode === "single") {
      return (
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="shrink-0 opacity-50">{icon}</span>}
          {selected.length > 0 ? (
            <span className="text-[15px] truncate">{getItemLabel(selected[0])}</span>
          ) : (
            <span className="text-[15px] text-[#6B7280]">{ph}</span>
          )}
        </div>
      );
    } else {
      // Multi mode
      if (selected.length === 0) {
        return (
          <div className="flex items-center gap-2">
            {icon && <span className="shrink-0 opacity-50">{icon}</span>}
            <span className="text-[15px] text-[#6B7280]">{ph}</span>
          </div>
        );
      }
      
      // Badges inside button
      if (badgesPosition === "inside") {
        return (
          <div className="flex flex-wrap gap-2 items-center min-h-[20px] w-full">
            {icon && <span className="shrink-0 opacity-50">{icon}</span>}
            {selected.map((item) => (
              <Badge
                key={getItemId(item)}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-0.5"
              >
                <span className="text-sm">{getItemLabel(item)}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(getItemId(item));
                  }}
                  disabled={disabled}
                  className="ml-0.5 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        );
      }
      
      // Badges outside - show counter
      return (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon && <span className="shrink-0 opacity-50">{icon}</span>}
          <span className="text-[15px] text-[#6B7280]">
            Выбрано: {selected.length}
          </span>
        </div>
      );
    }
  }, [mode, icon, getItemLabel, badgesPosition, getItemId, handleRemove, disabled]);
  
  const finalRenderItem = renderItem || defaultRenderItem;
  const finalRenderTrigger = renderTrigger || defaultRenderTrigger;
  
  // ========================================================================
  // UI
  // ========================================================================
  
  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between rounded-xl text-left font-normal shadow-none hover:bg-white",
              badgesPosition === "inside" && mode === "multi" ? "min-h-12 h-auto py-2" : "h-12",
              error && "border-red-500 focus:border-red-500",
              selectedItems.length === 0 && "text-[#6B7280]",
              className
            )}
          >
            {finalRenderTrigger(selectedItems, placeholder)}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className={cn("w-[var(--radix-popover-trigger-width)] p-0", popoverContentClassName)}
          align={popoverAlign}
          sideOffset={popoverSideOffset}
        >
          <Command shouldFilter={shouldFilter}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <CommandEmpty>{loadingMessage}</CommandEmpty>
              ) : items.length === 0 ? (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              ) : (
                <CommandGroup>
                  {items.map((item) => {
                    const itemId = getItemId(item);
                    const isSelected = valueArray.includes(itemId);
                    const isDisabled = mode === "multi" && maxItems && !isSelected && valueArray.length >= maxItems;
                    
                    return (
                      <CommandItem
                        key={itemId}
                        value={getItemLabel(item)}
                        onSelect={() => !isDisabled && handleSelect(item)}
                        className={cn(
                          "cursor-pointer",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {finalRenderItem(item, isSelected)}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Multi mode: Show selected badges below (only if outside) */}
      {mode === "multi" && selectedItems.length > 0 && badgesPosition === "outside" && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedItems.map((item) => (
            <Badge
              key={getItemId(item)}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="text-sm">{getItemLabel(item)}</span>
              <button
                type="button"
                onClick={() => handleRemove(getItemId(item))}
                disabled={disabled}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <div className="min-h-[20px] text-xs text-red-600 mt-1">
          {errorMessage}
        </div>
      )}
      
      {/* Max items message (multi mode) */}
      {!errorMessage && mode === "multi" && maxItems && valueArray.length >= maxItems && (
        <div className="min-h-[20px] text-xs text-gray-500 mt-1">
          Максимум {maxItems} {maxItems === 1 ? "элемент" : maxItems < 5 ? "элемента" : "элементов"}
        </div>
      )}
    </div>
  );
}
