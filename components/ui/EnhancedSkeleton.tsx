"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "shimmer";
}

export function EnhancedSkeleton({
  className,
  variant = "text",
  width,
  height,
  animation = "shimmer",
}: SkeletonProps) {
  const baseClasses = "bg-gray-800/50 overflow-hidden";
  
  const variantClasses = {
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-none",
    rounded: "rounded-lg",
  };

  const animationClasses = {
    pulse: "animate-pulse",
    wave: "",
    shimmer: "relative",
  };

  const style: React.CSSProperties = {
    width: width,
    height: height,
  };

  if (animation === "shimmer") {
    return (
      <div
        className={cn(baseClasses, variantClasses[variant], animationClasses[animation], className)}
        style={style}
      >
        <motion.div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gray-700/30 to-transparent"
          animate={{ translateX: ["0%", "200%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    );
  }

  if (animation === "wave") {
    return (
      <motion.div
        className={cn(baseClasses, variantClasses[variant], className)}
        style={style}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    );
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], animationClasses[animation], className)}
      style={style}
    />
  );
}

// Pre-built skeleton components for common use cases
export function PostSkeleton() {
  return (
    <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <EnhancedSkeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <EnhancedSkeleton width="40%" height={16} variant="rounded" />
          <EnhancedSkeleton width="25%" height={12} variant="rounded" />
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-2 mb-4">
        <EnhancedSkeleton width="100%" height={16} variant="rounded" />
        <EnhancedSkeleton width="90%" height={16} variant="rounded" />
        <EnhancedSkeleton width="60%" height={16} variant="rounded" />
      </div>
      
      {/* Image placeholder */}
      <EnhancedSkeleton 
        variant="rounded" 
        className="w-full h-48 mb-4" 
      />
      
      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
        <div className="flex gap-4">
          <EnhancedSkeleton width={60} height={24} variant="rounded" />
          <EnhancedSkeleton width={60} height={24} variant="rounded" />
          <EnhancedSkeleton width={60} height={24} variant="rounded" />
        </div>
        <EnhancedSkeleton width={24} height={24} variant="rounded" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar */}
        <EnhancedSkeleton variant="circular" width={120} height={120} />
        
        {/* Info */}
        <div className="flex-1 space-y-4 text-center md:text-left w-full">
          <EnhancedSkeleton width="60%" height={28} variant="rounded" className="mx-auto md:mx-0" />
          <EnhancedSkeleton width="40%" height={16} variant="rounded" className="mx-auto md:mx-0" />
          <EnhancedSkeleton width="80%" height={48} variant="rounded" className="mx-auto md:mx-0" />
          
          {/* Stats */}
          <div className="flex justify-center md:justify-start gap-6 pt-4">
            <EnhancedSkeleton width={80} height={60} variant="rounded" />
            <EnhancedSkeleton width={80} height={60} variant="rounded" />
            <EnhancedSkeleton width={80} height={60} variant="rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <EnhancedSkeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <EnhancedSkeleton width="50%" height={16} variant="rounded" />
            <EnhancedSkeleton width="70%" height={14} variant="rounded" />
          </div>
          <EnhancedSkeleton width={40} height={14} variant="rounded" />
        </div>
      ))}
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3 p-4 bg-gray-800/30 rounded-lg">
          <EnhancedSkeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <EnhancedSkeleton width="80%" height={16} variant="rounded" />
            <EnhancedSkeleton width="40%" height={12} variant="rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
    </div>
  );
}

