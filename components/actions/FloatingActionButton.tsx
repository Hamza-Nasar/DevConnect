"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  PenSquare,
  Video,
  Image as ImageIcon,
  Code,
  Calendar,
  Users,
} from "lucide-react";

const actions = [
  {
    icon: PenSquare,
    label: "New Post",
    path: "/create-post",
    color: "from-purple-500 to-blue-500",
    bgColor: "bg-purple-500/20",
  },
  {
    icon: Video,
    label: "Go Live",
    path: "/live",
    color: "from-red-500 to-pink-500",
    bgColor: "bg-red-500/20",
  },
  {
    icon: ImageIcon,
    label: "Share Media",
    path: "/create-post",
    color: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500/20",
  },
  {
    icon: Code,
    label: "Code Snippet",
    path: "/code-snippets",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500/20",
  },
  {
    icon: Calendar,
    label: "Create Event",
    path: "/events",
    color: "from-cyan-500 to-blue-500",
    bgColor: "bg-cyan-500/20",
  },
  {
    icon: Users,
    label: "New Group",
    path: "/groups/create",
    color: "from-indigo-500 to-purple-500",
    bgColor: "bg-indigo-500/20",
  },
];

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleAction = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  return (
    <>
      {/* Desktop FAB - Hidden on mobile (mobile uses bottom nav) */}
      <div className="hidden lg:block fixed bottom-8 right-8 z-40">
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              />

              {/* Action Items */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="absolute bottom-20 right-0 z-50 flex flex-col-reverse gap-3"
              >
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={action.path}
                      initial={{ opacity: 0, x: 50, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        scale: 1,
                        transition: { delay: index * 0.05 },
                      }}
                      exit={{
                        opacity: 0,
                        x: 50,
                        scale: 0.8,
                        transition: { delay: (actions.length - index) * 0.03 },
                      }}
                      whileHover={{ scale: 1.05, x: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAction(action.path)}
                      className="flex items-center gap-3 group"
                    >
                      {/* Label */}
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-3 py-1.5 bg-gray-900/95 backdrop-blur-sm rounded-lg text-sm font-medium text-white shadow-lg border border-gray-800/50 whitespace-nowrap"
                      >
                        {action.label}
                      </motion.span>

                      {/* Icon Button */}
                      <div
                        className={`w-12 h-12 rounded-full ${action.bgColor} border border-gray-700/50 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-r ${action.color} flex items-center justify-center`}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 transition-all duration-300 ${
            isOpen
              ? "bg-gray-800 border border-gray-700"
              : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
          }`}
        >
          {/* Glow Effect */}
          {!isOpen && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 blur-lg opacity-50 animate-pulse" />
          )}

          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative"
          >
            {isOpen ? (
              <X className="h-6 w-6 text-gray-300" />
            ) : (
              <Plus className="h-6 w-6 text-white" />
            )}
          </motion.div>
        </motion.button>

        {/* Tooltip */}
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute bottom-4 right-20 px-3 py-1.5 bg-gray-900/95 backdrop-blur-sm rounded-lg text-sm text-gray-300 whitespace-nowrap border border-gray-800/50 pointer-events-none hidden group-hover:block"
          >
            Create something new
          </motion.div>
        )}
      </div>

      {/* Mobile Quick Actions - Shown when scrolling up */}
      <MobileQuickActions />
    </>
  );
}

// Mobile Quick Actions Component
function MobileQuickActions() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  // Show on scroll up
  // This would typically use scroll detection, but for simplicity, 
  // we'll use the MobileBottomNav's create menu instead

  return null; // Mobile uses the MobileBottomNav create menu
}

