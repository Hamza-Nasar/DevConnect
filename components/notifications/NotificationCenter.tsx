"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Bell,
  X,
  Heart,
  MessageCircle,
  UserPlus,
  Share2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatTimeAgo } from "@/lib/utils";
import getSocket from "@/lib/socket";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "share" | "mention" | "system";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  user?: {
    id: string;
    name?: string;
    avatar?: string;
  };
}

export default function NotificationCenter() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = getSocket();
    if (socket) {
      socket.emit("join", session.user.id);

      socket.on("notification", (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
                        toast.success(notification.message);
      });
    }

    fetchNotifications();

    return () => {
      if (socket) {
        socket.off("notification");
      }
    };
  }, [session?.user?.id]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, any> = {
      like: Heart,
      comment: MessageCircle,
      follow: UserPlus,
      share: Share2,
      mention: MessageCircle,
      system: AlertCircle,
    };
    return icons[type] || Bell;
  };

  const getNotificationColor = (type: string) => {
    const colors = {
      like: "text-red-400",
      comment: "text-blue-400",
      follow: "text-green-400",
      share: "text-purple-400",
      mention: "text-yellow-400",
      system: "text-gray-400",
    };
    return colors[type as keyof typeof colors] || "text-gray-400";
  };

  if (!session) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
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

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Notifications"
        size="md"
      >
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {unreadCount > 0 && (
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <AnimatePresence>
              {notifications.map((notification) => {
                const NotificationIcon = getNotificationIcon(notification.type);
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Card
                      variant={notification.read ? "default" : "elevated"}
                      hover
                      className={`p-4 cursor-pointer border-l-4 ${
                        notification.read
                          ? "border-l-transparent"
                          : "border-l-purple-500"
                      }`}
                      onClick={() => {
                        markAsRead(notification.id);
                        if (notification.link && typeof window !== "undefined") {
                          window.location.href = notification.link;
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg bg-gray-800/50 ${getNotificationColor(
                            notification.type
                          )}`}
                        >
                          <NotificationIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-white">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-400 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatTimeAgo(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-purple-500 mt-2" />
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </Modal>
    </>
  );
}

