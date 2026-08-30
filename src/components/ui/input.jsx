import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    (<input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-3.5 py-1 text-base text-velvet-text transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-velvet-text placeholder:text-velvet-faint hover:border-white/[0.18] focus-visible:outline-none focus-visible:border-velvet-silver/40 focus-visible:ring-2 focus-visible:ring-velvet-silver/35 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }
