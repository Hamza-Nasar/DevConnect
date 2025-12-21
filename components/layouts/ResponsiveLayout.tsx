"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResponsiveLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  sidebarPosition?: "left" | "right";
  sidebarWidth?: "sm" | "md" | "lg";
  mainContent?: ReactNode;
  className?: string;
  gap?: "sm" | "md" | "lg";
}

export function ResponsiveLayout({
  children,
  sidebar,
  sidebarPosition = "left",
  sidebarWidth = "md",
  mainContent,
  className,
  gap = "lg",
}: ResponsiveLayoutProps) {
  const widthClasses = {
    sm: "w-full md:w-64",
    md: "w-full md:w-72 lg:w-80",
    lg: "w-full md:w-80 lg:w-96",
  };

  const gapClasses = {
    sm: "gap-4",
    md: "gap-6",
    lg: "gap-8",
  };

  if (sidebar) {
    return (
      <div
        className={cn(
          "flex flex-col",
          sidebarPosition === "left" ? "md:flex-row" : "md:flex-row-reverse",
          gapClasses[gap],
          className
        )}
      >
        <aside
          className={cn(
            "flex-shrink-0",
            widthClasses[sidebarWidth],
            "hidden md:block"
          )}
        >
          {sidebar}
        </aside>
        <main className="flex-1 min-w-0">
          {mainContent || children}
        </main>
      </div>
    );
  }

  return <div className={cn(className)}>{children}</div>;
}







