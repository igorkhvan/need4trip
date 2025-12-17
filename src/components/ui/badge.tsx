import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge компонент согласно Figma Design System
 * 
 * Типы:
 * - Subtle: цветной фон + цветной текст (статусы событий)
 * - Solid: заполненный фон + белый текст (категории событий)
 * 
 * Размеры:
 * - sm: 12px (для компактных карточек)
 * - md: 13px (основной размер)
 * - lg: 14px (для заголовков)
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border transition-colors",
  {
    variants: {
      variant: {
        // Subtle Badges (фон + цветной текст)
        "registration-open": "border-transparent bg-[#F0FDF4] text-[#16A34A]",
        "registration-closed": "border-transparent bg-[#FEF2F2] text-[#DC2626]",
        "starting-soon": "border-transparent bg-[#FFFBEB] text-[#D97706]",
        "almost-full": "border-transparent bg-[#FFFBEB] text-[#D97706]",
        "completed": "border-transparent bg-[#FEF2F2] text-[#DC2626]",
        "neutral": "border-transparent bg-[#F3F4F6] text-[#6B7280]",
        "attention": "border-transparent bg-[#FFF4EF] text-[#E86223]",
        
        // Generic Subtle Badges
        success: "border-transparent bg-[#F0FDF4] text-[#16A34A]",
        warning: "border-transparent bg-[#FFFBEB] text-[#D97706]",
        danger: "border-transparent bg-[#FEF2F2] text-[#DC2626]",
        info: "border-transparent bg-[#E5F6FF] text-[#0F4C75]",
        secondary: "border-transparent bg-[#FFF4EF] text-[#E86223]",
        
        // Solid Badges (заполненный фон + белый текст) для категорий событий
        "solid-orange": "border-transparent bg-[#FF6F2C] text-white",
        "solid-blue": "border-transparent bg-[#3B82F6] text-white",
        "solid-purple": "border-transparent bg-[#A855F7] text-white",
        "solid-yellow": "border-transparent bg-[#F59E0B] text-white",
        "solid-cyan": "border-transparent bg-[#06B6D4] text-white",
        "solid-gray": "border-transparent bg-[#374151] text-white",
        
        // Тип участия (платное/бесплатное)
        paid: "border-transparent bg-[#8B5CF6] text-white",
        free: "border-transparent bg-[#10B981] text-white",
        
        // Клубный статус
        club: "border-transparent bg-[#16A34A] text-white",
        
        // Premium / Pro статус
        premium: "border-transparent bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white",
        
        // Default (primary)
        default: "border-transparent bg-[#FF6F2C] text-white",
        
        // Outline
        outline: "border border-[#D1D5DB] bg-transparent text-[#374151]",
      },
      size: {
        sm: "px-2.5 py-0.5 text-[12px] font-medium",
        md: "px-3 py-1 text-[13px] font-medium",
        lg: "px-3.5 py-1 text-[14px] font-semibold",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
