/**
 * EventPricingSection - Event pricing section
 * 
 * Part of EventForm refactoring (Phase 1)
 * Extracted from monolithic event-form.tsx
 * 
 * Responsibilities:
 * - IsPaid radio buttons (Free/Paid)
 * - Price input (conditional)
 * - Currency select (conditional)
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencySelect } from "@/components/ui/currency-select";

interface EventPricingSectionProps {
  // Form values
  isPaid: boolean;
  price: string;
  currencyCode: string | null;
  
  // Change handlers
  onIsPaidChange: (value: boolean) => void;
  onPriceChange: (value: string) => void;
  onCurrencyChange: (value: string | null) => void;
  
  // Validation
  fieldErrors: Record<string, string>;
  clearFieldError: (field: string) => void;
  
  // UI state
  disabled?: boolean;
}

export function EventPricingSection({
  isPaid,
  price,
  currencyCode,
  onIsPaidChange,
  onPriceChange,
  onCurrencyChange,
  fieldErrors,
  clearFieldError,
  disabled,
}: EventPricingSectionProps) {
  return (
    <div className="mt-8 space-y-4">
      <Label className="text-sm font-medium text-[#111827]">Тип участия</Label>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
              !isPaid ? "border-[#FF6F2C]" : "border-[#E5E7EB] hover:border-[#6B7280]"
            }`}
          >
            {!isPaid && <div className="h-2.5 w-2.5 rounded-full bg-[#FF6F2C]" />}
          </div>
          <input
            type="radio"
            name="paid"
            checked={!isPaid}
            onChange={() => onIsPaidChange(false)}
            className="sr-only"
            disabled={disabled}
          />
          Бесплатное
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#374151]">
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
              isPaid ? "border-[#FF6F2C]" : "border-[#E5E7EB] hover:border-[#6B7280]"
            }`}
          >
            {isPaid && <div className="h-2.5 w-2.5 rounded-full bg-[#FF6F2C]" />}
          </div>
          <input
            type="radio"
            name="paid"
            checked={isPaid}
            onChange={() => onIsPaidChange(true)}
            className="sr-only"
            disabled={disabled}
          />
          Платное
        </label>
      </div>
      {isPaid && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-medium text-[#111827]">
                Цена
              </Label>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                step={1}
                value={price}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "");
                  onPriceChange(digitsOnly);
                  if (fieldErrors.price) {
                    clearFieldError("price");
                  }
                }}
                disabled={disabled}
                placeholder="5000"
                className={fieldErrors.price ? "border-red-500 focus:border-red-500" : ""}
              />
              <div className="min-h-[24px] text-xs text-red-600">{fieldErrors.price ?? ""}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#111827]">
                Валюта
              </Label>
              <CurrencySelect
                value={currencyCode}
                onChange={(newCode) => {
                  onCurrencyChange(newCode);
                  if (fieldErrors.currencyCode) {
                    clearFieldError("currencyCode");
                  }
                }}
                disabled={disabled}
                placeholder="Выберите валюту..."
                error={fieldErrors.currencyCode}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
