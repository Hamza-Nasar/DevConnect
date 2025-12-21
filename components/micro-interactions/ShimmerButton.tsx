"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ShimmerButton({
  children,
  variant = "primary",
  size = "default",
  className,
  ...props
}: ShimmerButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={`relative overflow-hidden ${className || ""}`}
      {...props}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
      />
      <span className="relative z-10">{children}</span>
    </Button>
  );
}







