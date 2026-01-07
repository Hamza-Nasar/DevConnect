"use client";

import { useState, useRef, useCallback, ReactNode } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { RefreshCw, ArrowDown } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
  disabled?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const handlePan = useCallback(
    (event: any, info: PanInfo) => {
      if (disabled || isRefreshing) return;

      // Only trigger if at the top of the scroll container
      const container = containerRef.current;
      if (!container) return;

      // Check if we're at the top
      const isAtTop = container.scrollTop <= 0;
      if (!isAtTop) return;

      // Only allow pulling down
      if (info.delta.y < 0 && pullDistance === 0) return;

      const newPullDistance = Math.max(0, Math.min(info.offset.y * 0.5, threshold * 1.5));
      setPullDistance(newPullDistance);
      setIsPulling(newPullDistance > 0);
    },
    [disabled, isRefreshing, threshold, pullDistance]
  );

  const handlePanEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold);

      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh failed:", error);
      }

      setIsRefreshing(false);
    }

    // Animate back to original position
    await controls.start({ y: 0 });
    setPullDistance(0);
    setIsPulling(false);
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh, controls]);

  const progress = Math.min(pullDistance / threshold, 1);
  const showIndicator = isPulling || isRefreshing;

  return (
    <div ref={containerRef} className="relative overflow-y-auto h-full">
      {/* Pull Indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-20 pointer-events-none"
        initial={{ opacity: 0, y: -60 }}
        animate={{
          opacity: showIndicator ? 1 : 0,
          y: showIndicator ? pullDistance - 60 : -60,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex flex-col items-center">
          {/* Circular Progress Indicator */}
          <div className="relative">
            <motion.div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isRefreshing
                  ? "bg-gradient-to-r from-purple-500 to-blue-500"
                  : "bg-gray-800/90 backdrop-blur-sm border border-gray-700"
              }`}
              animate={{
                rotate: isRefreshing ? 360 : 0,
              }}
              transition={{
                rotate: {
                  duration: 1,
                  repeat: isRefreshing ? Infinity : 0,
                  ease: "linear",
                },
              }}
            >
              {isRefreshing ? (
                <RefreshCw className="h-5 w-5 text-white" />
              ) : (
                <motion.div
                  animate={{ rotate: progress * 180 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <ArrowDown
                    className={`h-5 w-5 transition-colors ${
                      progress >= 1 ? "text-green-400" : "text-gray-400"
                    }`}
                  />
                </motion.div>
              )}
            </motion.div>

            {/* Progress Ring */}
            {!isRefreshing && isPulling && (
              <svg
                className="absolute inset-0 w-10 h-10 -rotate-90"
                viewBox="0 0 40 40"
              >
                <circle
                  className="text-gray-700"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="transparent"
                  r="18"
                  cx="20"
                  cy="20"
                />
                <motion.circle
                  className="text-purple-500"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="transparent"
                  r="18"
                  cx="20"
                  cy="20"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: 113.1,
                    strokeDashoffset: 113.1 * (1 - progress),
                  }}
                />
              </svg>
            )}
          </div>

          {/* Status Text */}
          <motion.span
            className="mt-2 text-xs font-medium text-gray-400"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {isRefreshing
              ? "Refreshing..."
              : progress >= 1
              ? "Release to refresh"
              : "Pull to refresh"}
          </motion.span>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        animate={controls}
        style={{
          y: isPulling || isRefreshing ? pullDistance : 0,
        }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}


