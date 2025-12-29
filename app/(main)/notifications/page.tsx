"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Bell,
    Heart,
    MessageCircle,
    UserPlus,
    Share2,
    AlertCircle,
    CheckCheck,
    MoreVertical,
    Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar/Navbar";
import { formatTimeAgo } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import getSocket from "@/lib/socket";

interface Notification {
    _id: string;
    id: string;
    type: "like" | "comment" | "follow" | "share" | "mention" | "system";
    title: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: string;
    postId?: string;
    userId?: string;
    user?: {
        id: string;
        name?: string;
        avatar?: string;
    };
}

export default function NotificationsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user?.id) {
            fetchNotifications();

            const socket = getSocket();
            if (socket) {
                socket.emit("join", session.user.id);
                socket.on("notification", (notification: any) => {
                    setNotifications((prev) => [notification, ...prev]);
                    toast.success(notification.message);
                });
            }

            return () => {
                if (socket) {
                    socket.off("notification");
                }
            };
        }
    }, [session?.user?.id]);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
            toast.error("Failed to load notifications");
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (notification: Notification) => {
        try {
            const res = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId: notification._id || notification.id }),
            });

            if (res.ok) {
                setNotifications((prev) =>
                    prev.map((n) => (n._id === notification._id || n.id === notification.id ? { ...n, read: true } : n))
                );
                
                // Handle different notification types
                if (notification.type === "like" && notification.postId) {
                    // Navigate to feed and scroll to post
                    router.push(`/feed?postId=${notification.postId}`);
                    // Scroll to post after navigation
                    setTimeout(() => {
                        const postElement = document.getElementById(`post-${notification.postId}`);
                        if (postElement) {
                            postElement.scrollIntoView({ behavior: "smooth", block: "center" });
                            postElement.classList.add("ring-2", "ring-purple-500", "ring-opacity-75");
                            setTimeout(() => {
                                postElement.classList.remove("ring-2", "ring-purple-500", "ring-opacity-75");
                            }, 2000);
                        }
                    }, 500);
                } else if (notification.type === "follow" && notification.userId) {
                    // Open user profile
                    router.push(`/profile/${notification.userId}`);
                } else if (notification.link) {
                    router.push(notification.link);
                }
            }
        } catch (error) {
            console.error("Error marking as read:", error);
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
                toast.success("All notifications marked as read");
            }
        } catch (error) {
            toast.error("Failed to update notifications");
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
            like: "text-red-400 bg-red-400/10",
            comment: "text-blue-400 bg-blue-400/10",
            follow: "text-green-400 bg-green-400/10",
            share: "text-purple-400 bg-purple-400/10",
            mention: "text-yellow-400 bg-yellow-400/10",
            system: "text-gray-400 bg-gray-400/10",
        };
        return colors[type as keyof typeof colors] || "text-purple-400 bg-purple-400/10";
    };

    if (status === "loading") return null;

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <Navbar />
            <div className="pt-16 sm:pt-20 lg:pl-72 xl:pl-80 pb-20 lg:pb-10">
                <div className="max-w-4xl mx-auto px-3 sm:px-6">
                    {/* Header - Mobile Optimized */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
                                <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
                                Notifications
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <Badge variant="danger" className="ml-1 sm:ml-2 px-2 py-0.5 text-xs sm:text-sm h-5 sm:h-6">
                                        {notifications.filter(n => !n.read).length}
                                    </Badge>
                                )}
                            </h1>
                            <p className="text-sm sm:text-base text-gray-400 mt-1">
                                Stay updated with your latest interactions
                            </p>
                        </div>
                        {notifications.some(n => !n.read) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 w-full sm:w-auto justify-center text-sm"
                            >
                                <CheckCheck className="h-4 w-4 mr-2" />
                                Mark all as read
                            </Button>
                        )}
                    </div>

                    {/* List */}
                    <div className="space-y-3">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-24 bg-gray-900/50 rounded-2xl animate-pulse" />
                            ))
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-20 bg-gray-900/20 rounded-[32px] border border-gray-800/50 border-dashed">
                                <div className="inline-flex items-center justify-center p-6 bg-gray-800/40 rounded-full mb-4">
                                    <Bell className="h-12 w-12 text-gray-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-white">No notifications yet</h3>
                                <p className="text-gray-500 mt-2">When people interact with you, they'll show up here.</p>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {notifications.map((notification, index) => {
                                    const Icon = getNotificationIcon(notification.type);
                                    const colorClass = getNotificationColor(notification.type);

                                    return (
                                        <motion.div
                                            key={notification._id || notification.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                        >
                                            <div
                                                onClick={() => !notification.read && markAsRead(notification)}
                                                className="block cursor-pointer"
                                            >
                                                <Card
                                                    variant={notification.read ? "default" : "elevated"}
                                                    hover
                                                    className={`group relative p-4 transition-all duration-300 ${notification.read
                                                        ? "bg-gray-900/10 border-gray-800/50"
                                                        : "bg-purple-500/5 border-purple-500/20 shadow-lg shadow-purple-500/5"
                                                        }`}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        {/* Avatar/Icon Section */}
                                                        <div className="relative flex-shrink-0">
                                                            {notification.user?.avatar ? (
                                                                <Avatar className="h-12 w-12 border border-gray-800 transition-transform group-hover:scale-105">
                                                                    <img src={notification.user.avatar} alt="" />
                                                                </Avatar>
                                                            ) : (
                                                                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${colorClass}`}>
                                                                    <Icon className="h-6 w-6" />
                                                                </div>
                                                            )}
                                                            {!notification.user?.avatar && (
                                                                <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-[#0a0a0a] ${colorClass}`}>
                                                                    <Icon className="h-3 w-3" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Content Section */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className={`text-sm font-semibold leading-tight mb-1 ${notification.read ? "text-gray-300" : "text-white"}`}>
                                                                        {notification.title}
                                                                    </p>
                                                                    <p className="text-sm text-gray-400 line-clamp-2">
                                                                        {notification.message}
                                                                    </p>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                                    <span className="text-[10px] text-gray-500 font-medium">
                                                                        {formatTimeAgo(notification.createdAt)}
                                                                    </span>
                                                                    {!notification.read && (
                                                                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
