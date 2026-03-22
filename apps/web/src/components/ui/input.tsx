import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, style, ...props }, ref) => (
    <input
      type={type}
      className={cn("flex h-9 w-full rounded-lg px-3 py-2 text-sm transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50", className)}
      style={{
        background: 'rgba(6, 9, 20, 0.8)',
        border: '1px solid rgba(0, 212, 255, 0.18)',
        color: 'rgba(255,255,255,0.85)',
        ...style
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.55)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,212,255,0.12)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.18)'; e.currentTarget.style.boxShadow = 'none' }}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"
export { Input }
