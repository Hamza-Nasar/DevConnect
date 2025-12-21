"use client";

import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface PulseBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info" | "outline";
  pulse?: boolean;
}

export function PulseBadge({
  children,
  variant = "danger",
  pulse = true,
}: PulseBadgeProps) {
  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <Badge variant={variant}>{children}</Badge>
    </motion.div>
  );
}







