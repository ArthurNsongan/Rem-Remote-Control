import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@shared/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-sans font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-primary/20 text-primary-foreground",
        online:
          "border-emerald-400/30 bg-emerald-400/15 text-emerald-200 shadow-[0_0_18px_-4px_rgb(52_211_153/0.6)]",
        offline: "border-white/10 bg-white/[0.05] text-muted-foreground",
        outline: "border-white/15 text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
