import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

// As variantes falam a linguagem do Velvet: cromo escovado como padrão,
// vidro escuro nas secundárias, e nada mais cai nos cinzas do tema shadcn.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-velvet-silver/55 focus-visible:ring-offset-2 focus-visible:ring-offset-velvet-abyss disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "btn-metal",
        destructive:
          "bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 hover:border-red-400/50",
        outline:
          "btn-ghost-metal !rounded-xl",
        secondary:
          "bg-white/[0.06] text-velvet-text border border-white/10 hover:bg-white/[0.11] hover:border-white/20",
        ghost: "text-velvet-dim hover:text-velvet-text hover:bg-white/[0.08]",
        link: "text-velvet-silver underline-offset-4 hover:underline hover:text-white",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
