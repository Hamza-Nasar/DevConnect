"use client";

import { useEffect, ReactNode } from "react";

interface SmoothScrollProps {
  children: ReactNode;
}

export function SmoothScroll({ children }: SmoothScrollProps) {
  useEffect(() => {
    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = "smooth";
    
    // Add smooth scroll polyfill for better browser support
    if (typeof window !== "undefined") {
      const smoothScrollPolyfill = () => {
        let rafId: number | null = null;
        let targetY = 0;
        let currentY = window.pageYOffset;

        const smoothScroll = () => {
          const diff = targetY - currentY;
          currentY += diff * 0.1;
          window.scrollTo(0, currentY);

          if (Math.abs(diff) > 0.5) {
            rafId = requestAnimationFrame(smoothScroll);
          }
        };

        const handleClick = (e: MouseEvent) => {
          const target = (e.target as HTMLElement).closest('a[href^="#"]');
          if (target) {
            const href = (target as HTMLAnchorElement).href;
            const id = href.split("#")[1];
            const element = document.getElementById(id);
            if (element) {
              e.preventDefault();
              targetY = element.offsetTop;
              currentY = window.pageYOffset;
              smoothScroll();
            }
          }
        };

        document.addEventListener("click", handleClick);
        return () => {
          document.removeEventListener("click", handleClick);
          if (rafId) cancelAnimationFrame(rafId);
        };
      };

      smoothScrollPolyfill();
    }
  }, []);

  return <>{children}</>;
}







