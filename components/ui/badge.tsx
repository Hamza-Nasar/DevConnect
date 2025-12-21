import React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gray-700 text-gray-200",
        primary: "bg-gradient-to-r from-purple-600 to-blue-600 text-white",
        success: "bg-green-600/20 text-green-400 border border-green-600/30",
        warning: "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30",
        danger: "bg-red-600/20 text-red-400 border border-red-600/30",
        info: "bg-blue-600/20 text-blue-400 border border-blue-600/30",
        outline: "border border-gray-600 text-gray-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}







