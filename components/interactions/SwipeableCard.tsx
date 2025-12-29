"use client";

import { ReactNode, useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Trash2, Archive, Star, MoreHorizontal } from "lucide-react";

interface SwipeAction {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
  onClick: () => void;
}

interface SwipeableCardProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
}

export default function SwipeableCard({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 100,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
}: SwipeableCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const x = useMotionValue(0);

  // Calculate opacity for action indicators
  const leftOpacity = useTransform(x, [0, threshold], [0, 1]);
  const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);

  // Calculate scale for action icons
  const leftScale = useTransform(x, [0, threshold], [0.5, 1]);
  const rightScale = useTransform(x, [-threshold, 0], [1, 0.5]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (disabled) return;

    const shouldSwipeLeft = info.offset.x < -threshold;
    const shouldSwipeRight = info.offset.x > threshold;

    if (shouldSwipeLeft && onSwipeLeft) {
      setIsAnimating(true);
      onSwipeLeft();
      setTimeout(() => setIsAnimating(false), 300);
    } else if (shouldSwipeRight && onSwipeRight) {
      setIsAnimating(true);
      onSwipeRight();
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Left Actions (revealed when swiping right) */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center px-4"
          style={{ opacity: leftOpacity }}
        >
          <div className="flex gap-2">
            {leftActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={index}
                  style={{ scale: leftScale }}
                  onClick={action.onClick}
                  className={`p-3 rounded-full ${action.bgColor} transition-colors`}
                >
                  <Icon className={`h-5 w-5 ${action.color}`} />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Right Actions (revealed when swiping left) */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center px-4"
          style={{ opacity: rightOpacity }}
        >
          <div className="flex gap-2">
            {rightActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={index}
                  style={{ scale: rightScale }}
                  onClick={action.onClick}
                  className={`p-3 rounded-full ${action.bgColor} transition-colors`}
                >
                  <Icon className={`h-5 w-5 ${action.color}`} />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className={`relative bg-gray-900/60 backdrop-blur-xl rounded-xl border border-gray-800/50 ${
          isAnimating ? "pointer-events-none" : ""
        }`}
        whileTap={{ cursor: "grabbing" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Pre-configured Swipeable Notification Card
interface SwipeableNotificationProps {
  children: ReactNode;
  onDelete?: () => void;
  onArchive?: () => void;
  onStar?: () => void;
}

export function SwipeableNotification({
  children,
  onDelete,
  onArchive,
  onStar,
}: SwipeableNotificationProps) {
  const leftActions: SwipeAction[] = [];
  const rightActions: SwipeAction[] = [];

  if (onStar) {
    leftActions.push({
      icon: Star,
      label: "Star",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20 hover:bg-yellow-500/30",
      onClick: onStar,
    });
  }

  if (onArchive) {
    leftActions.push({
      icon: Archive,
      label: "Archive",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20 hover:bg-blue-500/30",
      onClick: onArchive,
    });
  }

  if (onDelete) {
    rightActions.push({
      icon: Trash2,
      label: "Delete",
      color: "text-red-400",
      bgColor: "bg-red-500/20 hover:bg-red-500/30",
      onClick: onDelete,
    });
  }

  return (
    <SwipeableCard
      leftActions={leftActions}
      rightActions={rightActions}
      onSwipeLeft={onDelete}
      onSwipeRight={onArchive || onStar}
    >
      {children}
    </SwipeableCard>
  );
}

// Pre-configured Swipeable Message Card
interface SwipeableMessageProps {
  children: ReactNode;
  onReply?: () => void;
  onDelete?: () => void;
  isOwn?: boolean;
}

export function SwipeableMessage({
  children,
  onReply,
  onDelete,
  isOwn = false,
}: SwipeableMessageProps) {
  // For own messages, swipe left to delete
  // For others' messages, swipe right to reply
  const leftActions: SwipeAction[] = isOwn
    ? []
    : onReply
    ? [
        {
          icon: MoreHorizontal,
          label: "Reply",
          color: "text-purple-400",
          bgColor: "bg-purple-500/20",
          onClick: onReply,
        },
      ]
    : [];

  const rightActions: SwipeAction[] =
    isOwn && onDelete
      ? [
          {
            icon: Trash2,
            label: "Delete",
            color: "text-red-400",
            bgColor: "bg-red-500/20",
            onClick: onDelete,
          },
        ]
      : [];

  return (
    <SwipeableCard
      leftActions={leftActions}
      rightActions={rightActions}
      onSwipeLeft={isOwn ? onDelete : undefined}
      onSwipeRight={!isOwn ? onReply : undefined}
      threshold={80}
    >
      {children}
    </SwipeableCard>
  );
}

