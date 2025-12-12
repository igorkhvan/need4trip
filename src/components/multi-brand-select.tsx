import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);

  const sortedOptions = useMemo(
    () =>
      [...options].sort((a, b) =>
        a.name.localeCompare(b.name, "ru-RU", { sensitivity: "base" })
      ),
    [options]
  );

  const toggle = (id: string) => {
    if (disabled) return;
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    onChange(next);
  };

  const remove = (id: string) => {
    if (!value.includes(id) || disabled) return;
    onChange(value.filter((x) => x !== id));
  };

  const selected = sortedOptions.filter((opt) => value.includes(opt.id));

  return (
    <div className="space-y-2">
      {label ? <Label className="text-sm font-medium">{label}</Label> : null}
      <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex h-12 w-full items-center justify-between gap-2 rounded-xl border-2 bg-background px-3 text-left shadow-none hover:bg-white font-normal",
              error ? "border-red-500 focus-visible:ring-red-500" : "",
              disabled ? "cursor-not-allowed opacity-70" : ""
            )}
            disabled={disabled}
          >
            <div className="flex flex-wrap items-center gap-1">
              {selected.length === 0 ? (
                <span className="text-sm font-normal text-[#6B7280]">{placeholder}</span>
              ) : (
                selected.map((brand) => (
                  <Badge
                    key={brand.id}
                    variant="secondary"
                    className="flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(brand.id);
                    }}
                  >
                    {brand.name}
                    <X className="h-3 w-3" />
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(420px,calc(100vw-2rem))] p-0"
          align="start"
          sideOffset={6}
        >
          <Command>
            <CommandInput placeholder="Поиск марки..." />
            <CommandList>
              <CommandEmpty>Не найдено</CommandEmpty>
              <CommandGroup>
                {sortedOptions.map((option) => {
                  const isSelected = value.includes(option.id);
                  return (
                    <CommandItem
                      key={option.id}
                      value={option.name}
                      onSelect={() => toggle(option.id)}
                      className="cursor-pointer"
                    >
                      <span
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                          isSelected ? "border-primary bg-primary text-primary-foreground" : ""
                        )}
                      >
                        {isSelected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span>{option.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
