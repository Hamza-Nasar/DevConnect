"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  Eye,
  MessageCircle,
  Share2,
  Bookmark,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: number | string;
  change?: number; // percentage change
  icon?: React.ElementType;
  color?: string;
}

interface QuickStatsProps {
  stats: Stat[];
  className?: string;
  variant?: "default" | "compact" | "large";
}

export default function QuickStats({
  stats,
  className = "",
  variant = "default",
}: QuickStatsProps) {
  const formatValue = (value: number | string) => {
    if (typeof value === "string") return value;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return ArrowUp;
    if (change < 0) return ArrowDown;
    return Minus;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-400";
    if (change < 0) return "text-red-400";
    return "text-gray-400";
  };

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-4 sm:gap-6", className)}>
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="text-center"
          >
            <div className="text-lg sm:text-xl font-bold text-white">
              {formatValue(stat.value)}
            </div>
            <div className="text-xs text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (variant === "large") {
    return (
      <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {stats.map((stat, index) => {
          const Icon = stat.icon || TrendingUp;
          const ChangeIcon = stat.change !== undefined ? getChangeIcon(stat.change) : null;

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-gray-800/50 p-5 sm:p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={cn(
                    "p-3 rounded-xl",
                    stat.color || "bg-purple-500/20"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 sm:h-6 sm:w-6",
                      stat.color?.replace("bg-", "text-").replace("/20", "-400") ||
                        "text-purple-400"
                    )}
                  />
                </div>
                {stat.change !== undefined && ChangeIcon && (
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      getChangeColor(stat.change)
                    )}
                  >
                    <ChangeIcon className="h-3 w-3" />
                    <span>{Math.abs(stat.change)}%</span>
                  </div>
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {formatValue(stat.value)}
              </div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4",
        className
      )}
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const ChangeIcon = stat.change !== undefined ? getChangeIcon(stat.change) : null;

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              {Icon && (
                <Icon
                  className={cn(
                    "h-4 w-4",
                    stat.color?.replace("bg-", "text-").replace("/20", "-400") ||
                      "text-gray-400"
                  )}
                />
              )}
              {stat.change !== undefined && ChangeIcon && (
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium",
                    getChangeColor(stat.change)
                  )}
                >
                  <ChangeIcon className="h-3 w-3" />
                  <span>{Math.abs(stat.change)}%</span>
                </div>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white">
              {formatValue(stat.value)}
            </div>
            <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Pre-configured Profile Stats
interface ProfileStatsProps {
  posts: number;
  followers: number;
  following: number;
  likes?: number;
  className?: string;
}

export function ProfileStats({
  posts,
  followers,
  following,
  likes,
  className = "",
}: ProfileStatsProps) {
  return (
    <div className={cn("flex items-center justify-around py-4", className)}>
      <motion.button
        whileTap={{ scale: 0.95 }}
        className="text-center px-4 py-2 rounded-lg hover:bg-gray-800/50 transition-colors"
      >
        <div className="text-xl sm:text-2xl font-bold text-white">{posts}</div>
        <div className="text-xs sm:text-sm text-gray-400">Posts</div>
      </motion.button>
      
      <div className="w-px h-10 bg-gray-800" />
      
      <motion.button
        whileTap={{ scale: 0.95 }}
        className="text-center px-4 py-2 rounded-lg hover:bg-gray-800/50 transition-colors"
      >
        <div className="text-xl sm:text-2xl font-bold text-white">
          {followers >= 1000 ? `${(followers / 1000).toFixed(1)}K` : followers}
        </div>
        <div className="text-xs sm:text-sm text-gray-400">Followers</div>
      </motion.button>
      
      <div className="w-px h-10 bg-gray-800" />
      
      <motion.button
        whileTap={{ scale: 0.95 }}
        className="text-center px-4 py-2 rounded-lg hover:bg-gray-800/50 transition-colors"
      >
        <div className="text-xl sm:text-2xl font-bold text-white">{following}</div>
        <div className="text-xs sm:text-sm text-gray-400">Following</div>
      </motion.button>

      {likes !== undefined && (
        <>
          <div className="w-px h-10 bg-gray-800" />
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="text-center px-4 py-2 rounded-lg hover:bg-gray-800/50 transition-colors"
          >
            <div className="text-xl sm:text-2xl font-bold text-white">
              {likes >= 1000 ? `${(likes / 1000).toFixed(1)}K` : likes}
            </div>
            <div className="text-xs sm:text-sm text-gray-400">Likes</div>
          </motion.button>
        </>
      )}
    </div>
  );
}

// Engagement Stats Row
interface EngagementStatsProps {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  className?: string;
}

export function EngagementStats({
  views,
  likes,
  comments,
  shares,
  saves,
  className = "",
}: EngagementStatsProps) {
  const formatNum = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className={cn("flex items-center gap-4 text-sm text-gray-400", className)}>
      <div className="flex items-center gap-1.5">
        <Eye className="h-4 w-4" />
        <span>{formatNum(views)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Heart className="h-4 w-4" />
        <span>{formatNum(likes)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <MessageCircle className="h-4 w-4" />
        <span>{formatNum(comments)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Share2 className="h-4 w-4" />
        <span>{formatNum(shares)}</span>
      </div>
      {saves !== undefined && (
        <div className="flex items-center gap-1.5">
          <Bookmark className="h-4 w-4" />
          <span>{formatNum(saves)}</span>
        </div>
      )}
    </div>
  );
}

