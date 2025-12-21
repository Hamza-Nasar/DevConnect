"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: boolean;
}

export function Container({ 
  children, 
  className, 
  size = "lg",
  padding = true 
}: ContainerProps) {
  const sizeClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-full",
  };

  return (
    <div
      className={cn(
        "w-full mx-auto",
        sizeClasses[size],
        padding && "px-4 sm:px-6 md:px-8 lg:px-10",
        className
      )}
    >
      {children}
    </div>
  );
}







