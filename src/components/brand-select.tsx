import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);

  const sortedOptions = useMemo(
    () =>
      [...options].sort((a, b) =>
        a.name.localeCompare(b.name, "ru-RU", { sensitivity: "base" })
      ),
    [options]
  );

  const selectedBrand = sortedOptions.find((opt) => opt.id === value);

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-2 rounded-xl bg-background px-4 text-left shadow-none hover:bg-white font-normal",
            error ? "border-red-500 focus:border-red-500" : "",
            disabled ? "cursor-not-allowed opacity-70" : ""
          )}
          disabled={disabled}
        >
          <span className={cn(
            "text-[15px]",
            selectedBrand ? "text-[#1F2937]" : "text-[#6B7280]"
          )}>
            {selectedBrand ? selectedBrand.name : placeholder}
          </span>
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
                const isSelected = value === option.id;
                return (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{option.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
