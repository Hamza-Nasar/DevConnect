"use client";

import { useState, useRef, useCallback, ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  threshold?: number;
  disabled?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  className = "",
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  
  const pullDistance = useMotionValue(0);
  const opacity = useTransform(pullDistance, [0, threshold], [0, 1]);
  const scale = useTransform(pullDistance, [0, threshold], [0.5, 1]);
  const rotate = useTransform(pullDistance, [0, threshold * 2], [0, 360]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop > 0) {
      setIsPulling(false);
      pullDistance.set(0);
      return;
    }
    
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0) {
      // Apply resistance
      const resistance = 0.4;
      const newDistance = Math.min(diff * resistance, threshold * 1.5);
      pullDistance.set(newDistance);
      
      // Prevent default scroll when pulling
      if (diff > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, disabled, isRefreshing, pullDistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    
    if (pullDistance.get() >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    animate(pullDistance, 0, { duration: 0.3, ease: "easeOut" });
  }, [isPulling, disabled, pullDistance, threshold, isRefreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto momentum-scroll ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-10"
        style={{ 
          y: useTransform(pullDistance, [0, threshold], [-40, 20]),
          opacity 
        }}
      >
        <motion.div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isRefreshing 
              ? "bg-gradient-to-r from-purple-600 to-blue-600" 
              : "bg-gray-800/90"
          } border border-gray-700/50 shadow-lg backdrop-blur-sm`}
          style={{ scale }}
        >
          <motion.div
            style={{ rotate: isRefreshing ? undefined : rotate }}
            animate={isRefreshing ? { rotate: 360 } : undefined}
            transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : undefined}
          >
            <RefreshCw className={`h-5 w-5 ${
              isRefreshing 
                ? "text-white" 
                : pullDistance.get() >= threshold 
                  ? "text-purple-400" 
                  : "text-gray-400"
            }`} />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Pull hint text */}
      <motion.div
        className="absolute top-16 left-0 right-0 flex items-center justify-center pointer-events-none z-10"
        style={{ opacity }}
      >
        <span className="text-xs text-gray-400 font-medium">
          {isRefreshing 
            ? "Refreshing..." 
            : pullDistance.get() >= threshold 
              ? "Release to refresh" 
              : "Pull down to refresh"
          }
        </span>
      </motion.div>

      {/* Content with padding for indicator */}
      <motion.div
        style={{ 
          y: isRefreshing ? 60 : useTransform(pullDistance, [0, threshold * 1.5], [0, 60])
        }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {children}
      </motion.div>
    </div>
  );
}


