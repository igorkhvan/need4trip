/**
 * EventRulesSection - Event rules section
 * 
 * Part of EventForm refactoring (Phase 1)
 * Extracted from monolithic event-form.tsx
 * 
 * Responsibilities:
 * - Rules textarea only (header moved to parent)
 */

import { Textarea } from "@/components/ui/textarea";

interface EventRulesSectionProps {
  // Form value
  rules: string;
  onRulesChange: (value: string) => void;
  
  // AI generation (unused here, kept for compatibility)
  onGenerateAi: () => void;
  isGeneratingRules: boolean;
  
  // UI state
  disabled?: boolean;
  isSubmitting: boolean;
}

export function EventRulesSection({
  rules,
  onRulesChange,
  isGeneratingRules,
  disabled,
}: EventRulesSectionProps) {
  return (
    <Textarea
      id="rules"
      rows={8}
      value={rules}
      onChange={(e) => onRulesChange(e.target.value)}
      placeholder="Опишите условия: порядок движения, скорость, рация, запреты... Или используйте кнопку 'Сгенерировать правила (ИИ)'"
      disabled={disabled}
      className={isGeneratingRules ? "opacity-50" : ""}
    />
  );
}
