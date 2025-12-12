"use client";

import * as React from "react";
import { Check, ChevronsUpDown, DollarSign } from "lucide-react";
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
import { Currency } from "@/lib/types/currency";

export interface CurrencySelectProps {
  value: string | null;
  onChange: (currencyCode: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

/**
 * Currency Select Component
 * 
 * Searchable dropdown for selecting currencies.
 * Shows active currencies only.
 */
export function CurrencySelect({
  value,
  onChange,
  placeholder = "Выберите валюту...",
  disabled = false,
  error,
}: CurrencySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [currencies, setCurrencies] = React.useState<Currency[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Load active currencies on mount
  React.useEffect(() => {
    loadCurrencies();
  }, []);

  async function loadCurrencies() {
    setLoading(true);
    try {
      const res = await fetch("/api/currencies");
      if (res.ok) {
        const data = await res.json();
        setCurrencies(data);
      }
    } catch (error) {
      console.error("Failed to load currencies:", error);
    } finally {
      setLoading(false);
    }
  }

  // Find selected currency
  const selectedCurrency = currencies.find((currency) => currency.code === value);

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
              "w-full justify-between h-12 rounded-xl border-2",
              error && "border-red-500 focus-visible:ring-red-500",
              !selectedCurrency && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              {selectedCurrency ? (
                <span className="truncate">
                  {selectedCurrency.symbol} {selectedCurrency.nameRu} ({selectedCurrency.code})
                </span>
              ) : (
                <span>{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Поиск валюты..." />
            <CommandList>
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Загрузка...
                </div>
              ) : (
                <>
                  <CommandEmpty>Валюта не найдена</CommandEmpty>
                  <CommandGroup>
                    {currencies.map((currency) => (
                      <CommandItem
                        key={currency.code}
                        value={currency.code}
                        onSelect={() => {
                          onChange(currency.code === value ? null : currency.code);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === currency.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">{currency.symbol}</span>
                          <div className="flex flex-col">
                            <span className="font-medium">{currency.nameRu}</span>
                            <span className="text-xs text-gray-500">
                              {currency.code}
                            </span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
