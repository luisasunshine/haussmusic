import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    (<textarea
      className={cn(
        "flex min-h-[72px] w-full rounded-xl border border-white/[0.10] bg-white/[0.04] px-3.5 py-2.5 text-base text-velvet-text transition-colors placeholder:text-velvet-faint hover:border-white/[0.18] focus-visible:outline-none focus-visible:border-velvet-silver/40 focus-visible:ring-2 focus-visible:ring-velvet-silver/35 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Textarea.displayName = "Textarea"

export { Textarea }
