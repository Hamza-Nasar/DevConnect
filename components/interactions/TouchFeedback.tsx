"use client";

import { ReactNode, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TouchFeedbackProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  scale?: number;
  ripple?: boolean;
  rippleColor?: string;
}

export default function TouchFeedback({
  children,
  className = "",
  onClick,
  disabled = false,
  scale = 0.97,
  ripple = true,
  rippleColor = "rgba(255, 255, 255, 0.2)",
}: TouchFeedbackProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<{ x: number; y: number; key: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePress = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    setIsPressed(true);

    if (ripple && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      setRipples((prev) => [...prev, { x, y, key: Date.now() }]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.slice(1));
      }, 600);
    }
  };

  const handleRelease = () => {
    setIsPressed(false);
  };

  return (
    <motion.div
      ref={containerRef}
      onClick={disabled ? undefined : onClick}
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      onTouchStart={handlePress}
      onTouchEnd={handleRelease}
      animate={{
        scale: isPressed && !disabled ? scale : 1,
        opacity: isPressed && !disabled ? 0.9 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 20,
      }}
      className={cn(
        "relative overflow-hidden cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Ripple Effects */}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.key}
            initial={{ width: 0, height: 0, opacity: 0.5 }}
            animate={{ width: 200, height: 200, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: r.x - 100,
              top: r.y - 100,
              backgroundColor: rippleColor,
            }}
          />
        ))}
      </AnimatePresence>
      
      {children}
    </motion.div>
  );
}

// Haptic-like Press Button
interface HapticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger" | "success";
}

export function HapticButton({
  children,
  className = "",
  onClick,
  disabled = false,
  variant = "default",
}: HapticButtonProps) {
  const variantStyles = {
    default: "bg-gray-800/50 hover:bg-gray-700/50 text-gray-200",
    primary: "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white",
    danger: "bg-red-500/20 hover:bg-red-500/30 text-red-400",
    success: "bg-green-500/20 hover:bg-green-500/30 text-green-400",
  };

  return (
    <TouchFeedback
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </TouchFeedback>
  );
}

// Long Press Component
interface LongPressProps {
  children: ReactNode;
  onLongPress: () => void;
  duration?: number;
  className?: string;
}

export function LongPress({
  children,
  onLongPress,
  duration = 500,
  className = "",
}: LongPressProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleStart = () => {
    setIsLongPressing(true);
    
    // Start progress animation
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      
      if (p < 1) {
        timerRef.current = setTimeout(animate, 16);
      } else {
        onLongPress();
        handleEnd();
      }
    };
    animate();
  };

  const handleEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLongPressing(false);
    setProgress(0);
  };

  return (
    <motion.div
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      animate={{
        scale: isLongPressing ? 0.95 : 1,
      }}
      className={cn("relative cursor-pointer select-none", className)}
    >
      {/* Progress Ring */}
      {isLongPressing && (
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-10"
          viewBox="0 0 100 100"
        >
          <motion.circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="rgba(147, 51, 234, 0.5)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              strokeDasharray: 301.6,
              strokeDashoffset: 301.6 * (1 - progress),
            }}
          />
        </svg>
      )}
      
      {children}
    </motion.div>
  );
}

// Double Tap Component
interface DoubleTapProps {
  children: ReactNode;
  onDoubleTap: () => void;
  delay?: number;
  className?: string;
}

export function DoubleTap({
  children,
  onDoubleTap,
  delay = 300,
  className = "",
}: DoubleTapProps) {
  const lastTap = useRef(0);
  const [showHeart, setShowHeart] = useState(false);

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTap.current < delay) {
      // Double tap detected
      onDoubleTap();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
    lastTap.current = now;
  };

  return (
    <div
      onClick={handleTap}
      className={cn("relative cursor-pointer select-none", className)}
    >
      {children}
      
      {/* Heart Animation on Double Tap */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 0.3 }}
              className="text-red-500 text-6xl"
            >
              ❤️
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


