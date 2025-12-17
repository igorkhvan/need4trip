/**
 * EventVehicleSection - Vehicle requirements section
 * 
 * Part of EventForm refactoring (Phase 1)
 * Extracted from monolithic event-form.tsx
 * 
 * Responsibilities:
 * - VehicleType requirement select
 * - Allowed car brands multi-select
 */

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiBrandSelect, MultiBrandSelectOption } from "@/components/multi-brand-select";
import { VehicleTypeRequirement } from "@/lib/types/event";

interface EventVehicleSectionProps {
  // Form values
  vehicleType: VehicleTypeRequirement;
  allowedBrandIds: string[];
  
  // Change handlers
  onVehicleTypeChange: (value: VehicleTypeRequirement) => void;
  onAllowedBrandsChange: (value: string[]) => void;
  
  // External data
  brands: MultiBrandSelectOption[];
  vehicleTypes: Array<{ value: string; label: string }>;
  
  // Validation
  fieldErrors: Record<string, string>;
  
  // UI state
  disabled?: boolean;
}

export function EventVehicleSection({
  vehicleType,
  allowedBrandIds,
  onVehicleTypeChange,
  onAllowedBrandsChange,
  brands,
  vehicleTypes,
  fieldErrors,
  disabled,
}: EventVehicleSectionProps) {
  const fieldError = (path: string) => fieldErrors[path];
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vehicleTypeRequirement" className="text-sm font-medium text-[#111827]">
          Требование к типу авто
        </Label>
        <Select
          value={vehicleType}
          onValueChange={(val) => onVehicleTypeChange(val as VehicleTypeRequirement)}
          disabled={disabled}
        >
          <SelectTrigger id="vehicleTypeRequirement">
            <SelectValue placeholder="Выберите требование" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Любой</SelectItem>
            {vehicleTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <MultiBrandSelect
          label="Допустимые марки авто (опционально)"
          placeholder="Поиск марки..."
          options={brands}
          value={allowedBrandIds}
          onChange={onAllowedBrandsChange}
          error={fieldError("allowedBrandIds")}
          disabled={disabled}
        />
        <p className="text-sm text-[#6B7280]">
          Если не выбрано ни одной марки, участвовать могут любые автомобили.
        </p>
      </div>
    </div>
  );
}
