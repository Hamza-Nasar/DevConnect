"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "circular" | "rounded" | "text";
  animation?: "pulse" | "wave" | "shimmer";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = "default",
  animation = "wave",
  width,
  height,
}: SkeletonProps) {
  const baseStyles = "bg-gray-800/50";
  
  const variantStyles = {
    default: "rounded-md",
    circular: "rounded-full",
    rounded: "rounded-xl",
    text: "rounded h-4",
  };

  const animationStyles = {
    pulse: "animate-pulse",
    wave: "skeleton-wave",
    shimmer: "animate-shimmer",
  };

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
}

// Post Skeleton
export function PostSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-800/50 p-4 sm:p-6"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton variant="text" width="40%" className="mb-2" />
          <Skeleton variant="text" width="25%" height={12} />
        </div>
        <Skeleton variant="circular" width={32} height={32} />
      </div>

      {/* Content */}
      <div className="space-y-2 mb-4">
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="75%" />
      </div>

      {/* Image placeholder */}
      <Skeleton variant="rounded" className="w-full h-48 sm:h-64 mb-4" />

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
        <div className="flex items-center gap-4">
          <Skeleton variant="rounded" width={80} height={32} />
          <Skeleton variant="rounded" width={80} height={32} />
          <Skeleton variant="rounded" width={80} height={32} />
        </div>
        <Skeleton variant="circular" width={32} height={32} />
      </div>
    </motion.div>
  );
}

// Chat Skeleton
export function ChatSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4"
    >
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 mb-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1">
            <Skeleton variant="text" width="60%" className="mb-2" />
            <Skeleton variant="text" width="40%" height={12} />
          </div>
          <Skeleton variant="text" width={50} height={12} />
        </div>
      ))}
    </motion.div>
  );
}

// Message Skeleton
export function MessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      {!isOwn && <Skeleton variant="circular" width={32} height={32} className="mr-2" />}
      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        <Skeleton
          variant="rounded"
          className={`h-12 ${isOwn ? "w-48" : "w-56"}`}
        />
        <Skeleton variant="text" width={60} height={10} className="mt-1" />
      </div>
    </div>
  );
}

// Profile Skeleton
export function ProfileSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 sm:p-6"
    >
      {/* Cover */}
      <Skeleton variant="rounded" className="w-full h-32 sm:h-48 mb-4" />
      
      {/* Avatar & Info */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-20 mb-6">
        <Skeleton variant="circular" width={100} height={100} className="border-4 border-gray-900" />
        <div className="flex-1 text-center sm:text-left">
          <Skeleton variant="text" width={150} className="mb-2" />
          <Skeleton variant="text" width={100} height={12} />
        </div>
        <Skeleton variant="rounded" width={100} height={36} />
      </div>

      {/* Bio */}
      <div className="space-y-2 mb-6">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
      </div>

      {/* Stats */}
      <div className="flex justify-around py-4 border-t border-b border-gray-800/50 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton variant="text" width={40} className="mb-1 mx-auto" />
            <Skeleton variant="text" width={60} height={12} className="mx-auto" />
          </div>
        ))}
      </div>

      {/* Posts */}
      <div className="grid grid-cols-3 gap-1">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} variant="default" className="aspect-square" />
        ))}
      </div>
    </motion.div>
  );
}

// Notification Skeleton
export function NotificationSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-gray-900/50 border border-gray-800/50 mb-3"
    >
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 min-w-0">
          <Skeleton variant="text" width="70%" className="mb-2" />
          <Skeleton variant="text" width="50%" height={12} />
        </div>
        <Skeleton variant="text" width={40} height={10} />
      </div>
    </motion.div>
  );
}

// Card Skeleton
export function CardSkeleton({ hasImage = true }: { hasImage?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-800/50 p-4 overflow-hidden"
    >
      {hasImage && <Skeleton variant="rounded" className="w-full h-40 mb-4" />}
      <Skeleton variant="text" width="80%" className="mb-2" />
      <Skeleton variant="text" width="60%" height={12} className="mb-3" />
      <div className="flex items-center gap-2">
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="text" width={80} height={12} />
      </div>
    </motion.div>
  );
}

// Feed Skeleton (Multiple Posts)
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <PostSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

// Story Skeleton
export function StorySkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="flex-shrink-0"
        >
          <div className="relative">
            <Skeleton variant="circular" width={68} height={68} className="border-2 border-gray-800" />
            <div className="absolute inset-0 rounded-full border-2 border-gray-700 animate-pulse" />
          </div>
          <Skeleton variant="text" width={60} height={10} className="mt-2 mx-auto" />
        </motion.div>
      ))}
    </div>
  );
}

// Grid Skeleton (for explore page)
export function GridSkeleton({ cols = 3, count = 9 }: { cols?: number; count?: number }) {
  return (
    <div className={`grid grid-cols-${cols} gap-1 sm:gap-2`}>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.03 }}
        >
          <Skeleton variant="default" className="aspect-square" />
        </motion.div>
      ))}
    </div>
  );
}

