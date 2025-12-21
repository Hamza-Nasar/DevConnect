import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
  hover?: boolean;
}

export function Card({ 
  className, 
  variant = "default", 
  hover = false,
  children, 
  ...props 
}: CardProps) {
  const variants = {
    default: "bg-[rgb(var(--card))] border border-[rgb(var(--border))]",
    elevated: "bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm",
    outlined: "bg-transparent border border-[rgb(var(--border))]",
  };

  return (
    <div
      className={cn(
        "rounded-lg p-6",
        variants[variant],
        hover && "hover:bg-[rgb(var(--muted))] transition-colors cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 mb-4", className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-semibold leading-tight text-[rgb(var(--foreground))]", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-[rgb(var(--muted-foreground))]", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center pt-4 mt-4 border-t border-[rgb(var(--border))]", className)} {...props} />
  );
}

