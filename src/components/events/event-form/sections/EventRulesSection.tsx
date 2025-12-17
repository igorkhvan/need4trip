/**
 * EventRulesSection - Event rules section
 * 
 * Part of EventForm refactoring (Phase 1)
 * Extracted from monolithic event-form.tsx
 * 
 * Responsibilities:
 * - Rules textarea
 * - AI generation button
 */

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface EventRulesSectionProps {
  // Form value
  rules: string;
  onRulesChange: (value: string) => void;
  
  // AI generation
  onGenerateAi: () => void;
  isGeneratingRules: boolean;
  
  // UI state
  disabled?: boolean;
  isSubmitting: boolean;
  
  // Section number for display
  sectionNumber?: number;
}

export function EventRulesSection({
  rules,
  onRulesChange,
  onGenerateAi,
  isGeneratingRules,
  disabled,
  isSubmitting,
  sectionNumber,
}: EventRulesSectionProps) {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {sectionNumber && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF6F2C] text-sm font-semibold text-white">
              {sectionNumber}
            </div>
          )}
          <div>
            <p className="text-2xl font-semibold text-[#0F172A]">Правила участия</p>
            <p className="text-xs text-[#6B7280]">Показываются в карточке события</p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onGenerateAi}
          disabled={disabled || isGeneratingRules || isSubmitting}
        >
          {isGeneratingRules ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="hidden md:inline">Генерация...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="hidden md:inline">Сгенерировать правила (ИИ)</span>
            </>
          )}
        </Button>
      </div>
      <Textarea
        id="rules"
        rows={8}
        value={rules}
        onChange={(e) => onRulesChange(e.target.value)}
        placeholder="Опишите условия: порядок движения, скорость, рация, запреты... Или используйте кнопку 'Сгенерировать правила (ИИ)'"
        disabled={disabled}
        className={isGeneratingRules ? "opacity-50" : ""}
      />
    </>
  );
}
