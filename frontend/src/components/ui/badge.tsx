import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-1 text-xs font-bold uppercase",
  {
    variants: {
      variant: {
        default: "border-primary/[0.35] bg-primary/[0.14] text-primary shadow-[0_0_18px_rgb(186_255_0_/_0.16)]",
        secondary: "border-white/10 bg-secondary/[0.35] text-secondary-foreground",
        danger: "border-destructive/[0.35] bg-destructive/[0.14] text-red-200",
        muted: "border-border bg-muted/70 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
