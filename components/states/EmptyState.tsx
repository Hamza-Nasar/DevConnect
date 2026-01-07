"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Bell,
  Users,
  Heart,
  Bookmark,
  Search,
  Image as ImageIcon,
  Calendar,
  Code,
  FileText,
  Inbox,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateType =
  | "messages"
  | "notifications"
  | "posts"
  | "followers"
  | "following"
  | "likes"
  | "saved"
  | "search"
  | "media"
  | "events"
  | "code"
  | "comments"
  | "general"
  | "offline"
  | "error"
  | "success";

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const emptyStateConfig: Record<
  EmptyStateType,
  {
    icon: React.ElementType;
    defaultTitle: string;
    defaultDescription: string;
    iconColor: string;
    bgColor: string;
  }
> = {
  messages: {
    icon: MessageCircle,
    defaultTitle: "No messages yet",
    defaultDescription: "Start a conversation with someone!",
    iconColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  notifications: {
    icon: Bell,
    defaultTitle: "No notifications",
    defaultDescription: "When people interact with you, they'll show up here.",
    iconColor: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  posts: {
    icon: FileText,
    defaultTitle: "No posts yet",
    defaultDescription: "Share something with the community!",
    iconColor: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  followers: {
    icon: Users,
    defaultTitle: "No followers yet",
    defaultDescription: "Share your profile to gain followers.",
    iconColor: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  following: {
    icon: Users,
    defaultTitle: "Not following anyone",
    defaultDescription: "Discover and follow interesting people.",
    iconColor: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
  },
  likes: {
    icon: Heart,
    defaultTitle: "No likes yet",
    defaultDescription: "Posts you like will appear here.",
    iconColor: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  saved: {
    icon: Bookmark,
    defaultTitle: "No saved items",
    defaultDescription: "Save posts to view them later.",
    iconColor: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  search: {
    icon: Search,
    defaultTitle: "No results found",
    defaultDescription: "Try searching with different keywords.",
    iconColor: "text-gray-400",
    bgColor: "bg-gray-500/10",
  },
  media: {
    icon: ImageIcon,
    defaultTitle: "No media",
    defaultDescription: "Photos and videos will appear here.",
    iconColor: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  events: {
    icon: Calendar,
    defaultTitle: "No events",
    defaultDescription: "Create or join events to see them here.",
    iconColor: "text-pink-400",
    bgColor: "bg-pink-500/10",
  },
  code: {
    icon: Code,
    defaultTitle: "No code snippets",
    defaultDescription: "Share your code with the community!",
    iconColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  comments: {
    icon: MessageCircle,
    defaultTitle: "No comments yet",
    defaultDescription: "Be the first to comment!",
    iconColor: "text-teal-400",
    bgColor: "bg-teal-500/10",
  },
  general: {
    icon: Inbox,
    defaultTitle: "Nothing here",
    defaultDescription: "There's nothing to show yet.",
    iconColor: "text-gray-400",
    bgColor: "bg-gray-500/10",
  },
  offline: {
    icon: WifiOff,
    defaultTitle: "You're offline",
    defaultDescription: "Check your internet connection and try again.",
    iconColor: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  error: {
    icon: AlertCircle,
    defaultTitle: "Something went wrong",
    defaultDescription: "Please try again later.",
    iconColor: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  success: {
    icon: CheckCircle,
    defaultTitle: "All done!",
    defaultDescription: "Everything is up to date.",
    iconColor: "text-green-400",
    bgColor: "bg-green-500/10",
  },
};

export default function EmptyState({
  type,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center ${className}`}
    >
      {/* Icon Container with Animation */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className={`relative mb-6`}
      >
        {/* Glow Effect */}
        <div
          className={`absolute inset-0 ${config.bgColor} rounded-full blur-xl opacity-50`}
        />
        
        {/* Icon Circle */}
        <div
          className={`relative p-6 sm:p-8 rounded-full ${config.bgColor} border border-gray-800/50`}
        >
          <Icon className={`h-10 w-10 sm:h-14 sm:w-14 ${config.iconColor}`} />
        </div>

        {/* Floating Dots Animation */}
        <motion.div
          className="absolute -top-2 -right-2 w-3 h-3 bg-purple-500/50 rounded-full"
          animate={{
            y: [0, -10, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 -left-3 w-2 h-2 bg-blue-500/50 rounded-full"
          animate={{
            y: [0, 10, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg sm:text-xl font-bold text-white mb-2"
      >
        {title || config.defaultTitle}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm sm:text-base text-gray-400 max-w-md mb-6"
      >
        {description || config.defaultDescription}
      </motion.p>

      {/* Action Button */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="primary"
            onClick={action.onClick}
            className="px-6"
          >
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// Inline Empty State (smaller version)
interface InlineEmptyStateProps {
  icon?: React.ElementType;
  message: string;
  className?: string;
}

export function InlineEmptyState({
  icon: Icon = Inbox,
  message,
  className = "",
}: InlineEmptyStateProps) {
  return (
    <div
      className={`flex items-center justify-center gap-2 py-8 text-gray-500 ${className}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

// Connection Status Component
interface ConnectionStatusProps {
  isOnline: boolean;
  isConnecting?: boolean;
}

export function ConnectionStatus({
  isOnline,
  isConnecting = false,
}: ConnectionStatusProps) {
  if (isOnline && !isConnecting) return null;

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      className={`fixed top-0 left-0 right-0 z-[100] py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium ${
        isConnecting
          ? "bg-yellow-500/90 text-yellow-900"
          : "bg-red-500/90 text-white"
      }`}
    >
      {isConnecting ? (
        <>
          <Wifi className="h-4 w-4 animate-pulse" />
          <span>Reconnecting...</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You're offline</span>
        </>
      )}
    </motion.div>
  );
}


