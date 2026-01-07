"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
      <motion.div layout="preserve-aspect">
        {children}
      </motion.div>
      <div ref={observerTarget} className="h-16" />
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center py-8"
          >
            {loader || (
              <motion.div
                className="flex items-center gap-2"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                <span className="text-gray-400">Loading more...</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!hasMore && !isLoading && endMessage && (
          <motion.div
            key="end-message"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center py-8 text-gray-400"
          >
            {endMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
