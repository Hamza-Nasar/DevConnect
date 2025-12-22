"use client";

import * as React from "react";
import { motion } from "framer-motion";

interface ProgressProps {
    value?: number;
    className?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({ value = 0, className = "" }, ref) => (
        <div
            ref={ref}
            className={`relative h-4 w-full overflow-hidden rounded-full bg-secondary ${className}`}
        >
            <motion.div
                className="h-full w-full flex-1 bg-primary transition-all"
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            />
        </div>
    )
);
Progress.displayName = "Progress";

export { Progress };
