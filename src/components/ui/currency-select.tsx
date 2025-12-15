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

  // Track if default was set to avoid infinite loops
  const defaultSetRef = React.useRef(false);

  // Load active currencies on mount
  React.useEffect(() => {
    loadCurrencies();
  }, []);

  // Set KZT as default when currencies load (only if value is null and not disabled)
  React.useEffect(() => {
    if (
      currencies.length > 0 && 
      value === null && 
      !disabled && 
      !defaultSetRef.current
    ) {
      const kzt = currencies.find(c => c.code === 'KZT');
      if (kzt) {
        console.log('🇰🇿 Setting default currency to KZT');
        defaultSetRef.current = true;
        onChange('KZT');
      }
    }
  }, [currencies, value, disabled, onChange]);

  async function loadCurrencies() {
    setLoading(true);
    try {
      const res = await fetch("/api/currencies");
      if (res.ok) {
        const data = await res.json();
        console.log("✅ Loaded currencies:", data);
        setCurrencies(data);
      } else {
        console.error("❌ Failed to load currencies, status:", res.status);
        // Fallback to hardcoded popular currencies (KZT first as default)
        const fallback = [
          { code: "KZT", symbol: "₸", nameRu: "Казахстанский тенге", nameEn: "Kazakhstani Tenge", decimalPlaces: 2, isActive: true, sortOrder: 1, createdAt: new Date().toISOString() },
          { code: "RUB", symbol: "₽", nameRu: "Российский рубль", nameEn: "Russian Ruble", decimalPlaces: 2, isActive: true, sortOrder: 2, createdAt: new Date().toISOString() },
          { code: "USD", symbol: "$", nameRu: "Доллар США", nameEn: "US Dollar", decimalPlaces: 2, isActive: true, sortOrder: 10, createdAt: new Date().toISOString() },
          { code: "EUR", symbol: "€", nameRu: "Евро", nameEn: "Euro", decimalPlaces: 2, isActive: true, sortOrder: 11, createdAt: new Date().toISOString() },
        ];
        console.log("⚠️ Using fallback currencies");
        setCurrencies(fallback);
      }
    } catch (error) {
      console.error("❌ Failed to load currencies:", error);
      // Fallback currencies (KZT first as default)
      const fallback = [
        { code: "KZT", symbol: "₸", nameRu: "Казахстанский тенге", nameEn: "Kazakhstani Tenge", decimalPlaces: 2, isActive: true, sortOrder: 1, createdAt: new Date().toISOString() },
        { code: "RUB", symbol: "₽", nameRu: "Российский рубль", nameEn: "Russian Ruble", decimalPlaces: 2, isActive: true, sortOrder: 2, createdAt: new Date().toISOString() },
        { code: "USD", symbol: "$", nameRu: "Доллар США", nameEn: "US Dollar", decimalPlaces: 2, isActive: true, sortOrder: 10, createdAt: new Date().toISOString() },
        { code: "EUR", symbol: "€", nameRu: "Евро", nameEn: "Euro", decimalPlaces: 2, isActive: true, sortOrder: 11, createdAt: new Date().toISOString() },
      ];
      console.log("⚠️ Using fallback currencies");
      setCurrencies(fallback);
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
              "h-12 w-full justify-between rounded-xl text-left font-normal shadow-none hover:bg-white",
              error ? "border-red-500 focus:border-red-500" : "",
              !selectedCurrency && "text-[#6B7280]"
            )}
          >
            <div className="flex items-center gap-2">
              <DollarSign className={cn("h-4 w-4", selectedCurrency ? "text-[#6B7280]" : "text-[#6B7280]")} />
              {selectedCurrency ? (
                <span className="truncate text-[15px] text-[#111827]">
                  {selectedCurrency.symbol} {selectedCurrency.nameRu} ({selectedCurrency.code})
                </span>
              ) : (
                <span className="text-[15px]">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Поиск валюты..." className="h-10" />
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
                        value={`${currency.code} ${currency.nameRu} ${currency.nameEn}`}
                        keywords={[currency.code, currency.nameRu, currency.nameEn, currency.symbol]}
                        onSelect={() => {
                          onChange(currency.code === value ? null : currency.code);
                          setOpen(false);
                        }}
                        className="cursor-pointer"
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
                            <span className="text-xs text-[#6B7280]">
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

      {/* Error message with fixed height */}
      <div className="min-h-[28px] text-xs text-red-600">
        {error || ""}
      </div>
    </div>
  );
}
