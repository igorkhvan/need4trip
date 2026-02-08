/**
 * EventRulesSection - Event rules section
 * 
 * Part of EventForm refactoring (Phase 1)
 * Extracted from monolithic event-form.tsx
 * 
 * Responsibilities:
 * - Rules rich text editor (header moved to parent)
 */

import { RichTextEditor } from "@/components/ui/rich-text-editor";

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
    <RichTextEditor
      value={rules}
      onChange={onRulesChange}
      placeholder="Опишите условия: порядок движения, скорость, рация, запреты... Или используйте кнопку генерации с помощью ИИ в заголовке секции"
      disabled={disabled || isGeneratingRules}
      minHeight="192px"
      className={isGeneratingRules ? "opacity-50" : ""}
    />
  );
}
