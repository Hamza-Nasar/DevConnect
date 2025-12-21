"use client";

import { useState, MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RippleEffectProps {
  children: React.ReactNode;
  className?: string;
}

export function RippleEffect({ children, className = "" }: RippleEffectProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((ripple) => ripple.id !== id));
    }, 600);
  };

  return (
    <div className={`relative overflow-hidden ${className}`} onClick={handleClick}>
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 pointer-events-none"
            initial={{ width: 0, height: 0, opacity: 1 }}
            animate={{ width: 300, height: 300, opacity: 0 }}
            exit={{ opacity: 0 }}
            style={{
              left: ripple.x - 150,
              top: ripple.y - 150,
            }}
            transition={{ duration: 0.6 }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}







