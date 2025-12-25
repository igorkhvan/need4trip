/**
 * EventPricingSection - Event pricing section
 * 
 * Part of EventForm refactoring (Phase 1)
 * Extracted from monolithic event-form.tsx
 * 
 * Responsibilities:
 * - Price input (conditional, shown only when isPaid=true)
 * - Currency select (conditional, shown only when isPaid=true)
 * 
 * Note: "Тип участия" (isPaid) moved to EventBasicInfoSection
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencySelect } from "@/components/ui/currency-select";
import { FormField } from "@/components/ui/form-field";

interface EventPricingSectionProps {
  // Form values
  isPaid: boolean; // Read-only: controlled by EventBasicInfoSection
  price: string;
  currencyCode: string | null;
  
  // Change handlers (no onIsPaidChange - moved to EventBasicInfoSection)
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
  onPriceChange,
  onCurrencyChange,
  fieldErrors,
  clearFieldError,
  disabled,
}: EventPricingSectionProps) {
  // Only render if event is paid
  if (!isPaid) {
    return null;
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          id="price"
          label="Цена"
          required
          error={fieldErrors.price}
        >
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
        </FormField>

        <FormField
          id="currency"
          label="Валюта"
          required
          error={fieldErrors.currencyCode}
        >
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
          />
        </FormField>
      </div>
    </div>
  );
}
