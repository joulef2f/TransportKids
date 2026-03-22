import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
        secondary: "border border-purple-500/30 bg-purple-500/10 text-purple-400",
        destructive: "border border-red-500/30 bg-red-500/10 text-red-400",
        outline: "border border-white/15 text-white/60",
        success: "border border-green-500/30 bg-green-500/10 text-green-400",
        warning: "border border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
