import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-brand-200/50 bg-brand-100 text-brand-700",
        secondary:
          "border-slate-200/50 bg-slate-100 text-slate-700",
        success:
          "border-emerald-200/50 bg-emerald-50 text-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
        warning:
          "border-amber-200/50 bg-amber-50 text-amber-700",
        danger:
          "border-red-200/50 bg-red-50 text-red-700",
        outline: "border-slate-300 text-ink-muted bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
