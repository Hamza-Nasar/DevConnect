"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import getSocket from "@/lib/socket";
import { playMessageTone } from "@/lib/soundUtils";
import { Message } from "@/types/chat";

interface NotificationMessage extends Message {
  chatUser: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    status?: "online" | "offline" | "away" | "busy";
  };
}


export default function GlobalMessagePopup() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [popupEnabled, setPopupEnabled] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);


  // Load user preferences
  useEffect(() => {
    const soundPreference = localStorage.getItem("message_sound_enabled");
    const popupPreference = localStorage.getItem("message_popup_enabled");

    if (soundPreference !== null) {
      setSoundEnabled(soundPreference === "true");
    }
    if (popupPreference !== null) {
      setPopupEnabled(popupPreference === "true");
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !popupEnabled) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (message: NotificationMessage) => {
      // Don't show popup if user is currently in chat
      if (pathname?.includes('/chat') || pathname?.includes('/messages')) {
        return;
      }

      // Don't show popup for own messages
      if (session?.user?.id && message.senderId === session.user.id) {
        return;
      }

      // Check if message is for current user
      if (message.receiverId === session?.user?.id) {
        // Play sound if enabled
        if (soundEnabled) {
          playMessageTone();
        }

        // Ensure message has chatUser format for popup
        const popupMessage: NotificationMessage = message.chatUser ? message : {
          ...message,
          chatUser: message.sender ? {
            id: message.sender.id,
            name: message.sender.name || 'Unknown User',
            username: message.sender.username || 'user',
            avatar: message.sender.avatar,
            status: 'online'
          } : {
            id: message.senderId,
            name: 'Unknown User',
            username: 'user',
            avatar: '',
            status: 'online'
          }
        };

        // Add notification
        setNotifications(prev => {
          const newNotification = {
            ...popupMessage,
            id: `popup-${Date.now()}-${Math.random()}`,
          };
          return [newNotification, ...prev].slice(0, 3);
        });

        // Auto-dismiss after 5 seconds
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setNotifications([]);
        }, 5000);
      }
    };

    socket.on("global_message_notification", handleNewMessage);
    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("global_message_notification");
      socket.off("new_message");
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [session?.user?.id, pathname, soundEnabled, popupEnabled, session]);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClickNotification = (notification: NotificationMessage) => {
    // Navigate to chat with the user
    router.push(`/chat?userId=${notification.senderId}`);
    setNotifications([]);
  };

  if (!popupEnabled || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              delay: index * 0.1
            }}
            className="bg-gray-900/98 backdrop-blur-xl border border-gray-700/60 rounded-xl shadow-2xl p-4 cursor-pointer hover:bg-gray-800/98 hover:border-purple-500/30 transition-all duration-200 group hover:shadow-purple-500/10 hover:shadow-2xl"
            onClick={() => handleClickNotification(notification)}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <RealTimeAvatar
                  userId={notification.sender?.id || notification.senderId}
                  src={notification.sender?.avatar}
                  alt={notification.sender?.name || "User"}
                  size="sm"
                  status={notification.chatUser?.status || "offline"}
                  className="ring-2 ring-purple-500/20"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-white text-sm truncate">
                      {notification.sender?.name || notification.chatUser?.name || "User"}
                    </span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(notification.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>

                <p className="text-gray-300 text-sm line-clamp-2">
                  {notification.content || "New message"}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <MessageCircle className="h-3 w-3 text-purple-400 animate-pulse" />
                  <span className="text-xs text-gray-500">
                    {new Date(notification.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                    <span className="text-xs text-green-400 font-medium">New</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar for auto-dismiss */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-600 rounded-b-xl"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5, ease: "linear" }}
              style={{ transformOrigin: 'left' }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}