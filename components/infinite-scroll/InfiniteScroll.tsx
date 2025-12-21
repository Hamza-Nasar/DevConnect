"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { motion } from "framer-motion";

interface InfiniteScrollProps {
  children: ReactNode;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  loader?: ReactNode;
  endMessage?: ReactNode;
  threshold?: number;
}

export function InfiniteScroll({
  children,
  loadMore,
  hasMore,
  isLoading,
  loader,
  endMessage,
  threshold = 200,
}: InfiniteScrollProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsIntersecting(entry.isIntersecting);
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [threshold]);

  useEffect(() => {
    if (isIntersecting && hasMore && !isLoading) {
      loadMore();
    }
  }, [isIntersecting, hasMore, isLoading, loadMore]);

  return (
    <>
      {children}
      <div ref={observerTarget} className="h-10" />
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-8"
        >
          {loader || (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
              <span className="text-gray-400">Loading more...</span>
            </div>
          )}
        </motion.div>
      )}
      {!hasMore && !isLoading && endMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8 text-gray-400"
        >
          {endMessage}
        </motion.div>
      )}
    </>
  );
}
