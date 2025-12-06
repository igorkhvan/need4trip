import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#E5F6FF] text-[#0F4C75]",
        secondary: "border-transparent bg-[#FFF4EF] text-[#E86223]",
        success: "border-transparent bg-[#F0FDF4] text-[#16A34A]",
        warning: "border-transparent bg-[#FFFBEB] text-[#D97706]",
        danger: "border-transparent bg-[#FEF2F2] text-[#DC2626]",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
