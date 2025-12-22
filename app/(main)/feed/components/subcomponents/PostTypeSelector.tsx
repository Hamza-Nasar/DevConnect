"use client";

import { motion } from "framer-motion";
import { FileText, BarChart3 as PollIcon, Zap, Film } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PostTypeSelectorProps {
  postType: "text" | "poll" | "story" | "reel";
  setPostType: (type: "text" | "poll" | "story" | "reel") => void;
}

export default function PostTypeSelector({ postType, setPostType }: PostTypeSelectorProps) {
  const types = [
    { id: "text", label: "Text", icon: FileText },
    { id: "poll", label: "Poll", icon: PollIcon },
    { id: "story", label: "Story", icon: Zap },
    { id: "reel", label: "Reel", icon: Film },
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 sm:flex sm:flex-wrap sm:p-2 sm:bg-gray-800/20 sm:rounded-xl sm:border sm:border-gray-700/30">
      {types.map((type) => {
        const Icon = type.icon;
        const isActive = postType === type.id;
        
        return (
          <motion.div
            key={type.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0"
          >
            <Button
              type="button"
              variant={isActive ? "primary" : "ghost"}
              size="sm"
              onClick={() => setPostType(type.id)}
              className={`w-full flex flex-col items-center gap-1 p-2 sm:p-3 h-auto transition-all group sm:flex-row sm:capitalize sm:text-xs sm:text-sm sm:px-3 ${
                isActive
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20 border border-purple-500/50 sm:border-0"
                  : "bg-gray-800/30 hover:bg-gray-800/60 border border-gray-700/50 hover:border-purple-500/50"
              } rounded-lg sm:rounded-xl`}
            >
              <Icon className={`h-4 w-4 sm:mr-1.5 ${isActive ? "text-white" : "text-purple-400 group-hover:text-purple-300"}`} />
              <span className={`text-[10px] sm:text-xs ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`}>
                {type.label}
              </span>
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}
