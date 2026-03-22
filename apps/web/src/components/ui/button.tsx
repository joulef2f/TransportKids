import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "text-black font-semibold",
        destructive: "bg-destructive/90 text-white hover:bg-destructive",
        outline: "border bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary/20 text-secondary border border-secondary/30 hover:bg-secondary/30",
        ghost: "hover:bg-accent/60 text-muted-foreground hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, children, disabled, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const defaultStyle = variant === 'default' || !variant
      ? { background: 'linear-gradient(135deg, #00d4ff, #0088ff)', boxShadow: '0 0 16px rgba(0,212,255,0.25)', ...style }
      : style
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref}
        disabled={disabled || isLoading} style={defaultStyle} {...props}>
        {isLoading && <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
