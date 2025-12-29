"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarProps } from "@/components/ui/avatar";
import getSocket from "@/lib/socket";
import { onlineStatusStore } from "@/lib/onlineStatusStore";

interface RealTimeAvatarProps extends Omit<AvatarProps, "src" | "status"> {
  userId?: string;
  src?: string | null;
  status?: "online" | "offline" | "away" | "busy";
  alternativeIds?: string[];
  showOnlineStatus?: boolean;
}

export default function RealTimeAvatar({
  userId,
  src,
  status: initialStatus,
  alternativeIds = [],
  showOnlineStatus = true,
  ...props
}: RealTimeAvatarProps) {
  const [avatarSrc, setAvatarSrc] = useState(src);
  const [status, setStatus] = useState<"online" | "offline" | "away" | "busy">(initialStatus || "offline");

  useEffect(() => {
    setAvatarSrc(src);
  }, [src]);

  // Sync with OnlineStatusStore
  useEffect(() => {
    if (!userId) {
      if (!initialStatus) setStatus("offline");
      return;
    }

    const updateStatus = () => {
      let isOnline = onlineStatusStore.isUserOnline(userId);

      // Check alternative IDs if main ID is offline
      if (!isOnline && alternativeIds.length > 0) {
        for (const altId of alternativeIds) {
          if (onlineStatusStore.isUserOnline(altId)) {
            isOnline = true;
            break;
          }
        }
      }

      setStatus(isOnline ? "online" : (initialStatus || "offline"));
    };

    // Initial check
    updateStatus();

    // Subscribe to changes
    const handleStoreChange = () => {
      updateStatus();
    };

    onlineStatusStore.on("change", handleStoreChange);

    return () => {
      onlineStatusStore.off("change", handleStoreChange);
    };
  }, [userId, JSON.stringify(alternativeIds), initialStatus]);

  // Listen for avatar changes (still using socket directly for this specific event to avoid bloating store, or could move to store too)
  // For now, let's keep avatar changes here or move to store. 
  // Store is onlineStatusStore, maybe it should be userStore?
  // Let's keep avatar change here for now to minimize refactor risk, or adding to store?
  // The store I created *does* have avatar listener? No, I only put online status.
  // Wait, I should probably stick to socket for avatar update for now to avoid scope creep, 
  // OR add it to store. The store is named OnlineStatusStore.
  // I'll keep individual socket listener for avatar updates for now, as they are rare events.
  // Actually, keeping 100 listeners for avatar events is also bad.
  // But let's fix the STATUS issue first (the "nhi horaha" part).

  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    if (!socket) return;

    const handleAvatarChange = (data: { userId: string; avatar: string }) => {
      if (data.userId === userId || alternativeIds.includes(data.userId)) {
        setAvatarSrc(data.avatar);
      }
    };

    socket.on("avatar_changed", handleAvatarChange);
    return () => {
      socket.off("avatar_changed", handleAvatarChange);
    };
  }, [userId, JSON.stringify(alternativeIds)]);

  return <Avatar src={avatarSrc || src} status={showOnlineStatus ? status : undefined} {...props} />;
}
