import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "text" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = "default",
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-gray-700/50 rounded";

  const variantClasses = {
    default: "rounded-lg",
    circular: "rounded-full",
    text: "rounded h-4",
    rectangular: "rounded-none",
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{
        width: width || (variant === "circular" ? height : "100%"),
        height: height || (variant === "text" ? "1rem" : "100%"),
        ...style,
      }}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 space-y-4", className)}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="60%" />
        </div>
      </div>
      <SkeletonText lines={3} />
      <div className="flex gap-2">
        <Skeleton variant="text" width="20%" />
        <Skeleton variant="text" width="20%" />
        <Skeleton variant="text" width="20%" />
      </div>
    </div>
  );
}







