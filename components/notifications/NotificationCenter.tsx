"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import getSocket from "@/lib/socket";
import toast from "react-hot-toast";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
}

export default function NotificationCenter() {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = getSocket();
    if (socket) {
      socket.emit("join", session.user.id);

      socket.on("notification", (notification: Notification) => {
        setUnreadCount((prev) => prev + 1);
        toast.success(notification.message);
      });
    }

    fetchUnreadCount();

    return () => {
      if (socket) {
        socket.off("notification");
      }
    };
  }, [session?.user?.id]);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  };

  if (!session) return null;

  return (
    <Link href="/notifications">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="danger"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>
    </Link>
  );
}
