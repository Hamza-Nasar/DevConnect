"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";

interface HoverCardProps {
  children: React.ReactNode;
  content: React.ReactNode;
  delay?: number;
}

export function HoverCard({ children, content, delay = 300 }: HoverCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, delay: delay / 1000 }}
            className="absolute z-50 top-full left-0 mt-2"
          >
            <Card variant="elevated" className="p-4 min-w-[200px] shadow-2xl">
              {content}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}







