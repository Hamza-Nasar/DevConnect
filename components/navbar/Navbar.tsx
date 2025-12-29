"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Search,
  Bell,
  MessageCircle,
  User,
  Settings,
  LogOut,
  Plus,
  TrendingUp,
  Users,
  Calendar,
  Bookmark,
  Zap,
  Menu,
  X,
  BarChart3,
  Video,
  Image as ImageIcon,
  Music,
  Code,
  Gamepad2,
  Heart,
  Share2,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import ThemeToggle from "@/components/theme/ThemeToggle";
import getSocket from "@/lib/socket";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { onlineStatusStore } from "@/lib/onlineStatusStore";

export default function Navbar() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState(0);
  const [socketAvatar, setSocketAvatar] = useState<string | null>(null);
  const userAvatar = socketAvatar || session?.user?.image;

  // Real-time updates (Avatar & Messages)
  useEffect(() => {
    onlineStatusStore.init();

    // 1. Fetch initial unread messages count
    const fetchUnreadMessages = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch("/api/messages");
        if (res.ok) {
          const data = await res.json();
          // Sum up unread counts from all chats
          const count = data.chats?.reduce((acc: number, chat: any) => acc + (chat.unreadCount || 0), 0) || 0;
          setMessages(count);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchUnreadMessages();

    const socket = getSocket();
    if (!socket || !session?.user?.id) return;

    const userId = session.user.id;

    // 2. Listen for avatar changes
    const handleAvatarChange = (data: { userId: string; avatar: string }) => {
      if (data.userId === userId) {
        setSocketAvatar(data.avatar);
        updateSession({
          user: { image: data.avatar },
        });
      }
    };

    // 3. Listen for new messages to update badge
    const handleNewMessage = (data: any) => {
      // If message is for me, increment/refetch
      if (data.receiverId === userId) {
        fetchUnreadMessages();
      }
    };

    // 4. Listen for message read status
    const handleMessagesRead = () => {
      fetchUnreadMessages();
    };

    const onConnect = () => {
      console.log("🔌 [Navbar] Socket reconnected, joining room...");
      socket.emit("join", userId);
    };

    if (socket.connected) {
      socket.emit("join", userId);
    }

    socket.on("connect", onConnect);
    socket.on("avatar_changed", handleAvatarChange);
    socket.on("new_message", handleNewMessage);
    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("connect", onConnect);
      socket.off("avatar_changed", handleAvatarChange);
      socket.off("new_message", handleNewMessage);
      socket.off("messages_read", handleMessagesRead);
    };
  }, [session?.user?.id]); // Removed updateSession to prevent re-runs, and we only care about user ID changes

  const navItems = [
    { icon: Home, label: "Feed", path: "/feed", badge: null },
    { icon: Bell, label: "Notifications", path: "/notifications", badge: null },
    { icon: Search, label: "Explore", path: "/explore", badge: null },
    { icon: TrendingUp, label: "Trending", path: "/trending", badge: "Hot" },
    { icon: Users, label: "Groups", path: "/groups", badge: null },
    { icon: MessageCircle, label: "Messages", path: "/chat", badge: messages },
    { icon: Calendar, label: "Events", path: "/events", badge: null },
    { icon: Bookmark, label: "Saved", path: "/saved", badge: null },
    { icon: BarChart3, label: "Analytics", path: "/analytics", badge: null },
    { icon: Code, label: "Code Snippets", path: "/code-snippets", badge: null },
    { icon: Video, label: "Live", path: "/live", badge: "LIVE" },
    { icon: Sparkles, label: "Recommendations", path: "/recommendations", badge: null },
  ];

  const quickActions = [
    { icon: Plus, label: "Create Post", action: () => router.push("/create-post") },
    { icon: Video, label: "Go Live", action: () => router.push("/live") },
    { icon: ImageIcon, label: "Upload Media", action: () => router.push("/create-post") },
    { icon: Code, label: "Code Snippet", action: () => router.push("/code-snippets") },
  ];

  if (!session) return null;

  return (
    <>
      {/* Top Navigation Bar - Enhanced Responsive Design */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo - Enhanced for Mobile */}
            <Link href="/feed" className="flex items-center space-x-2 group flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-1.5 sm:p-2 rounded-lg transform group-hover:scale-105 transition-transform duration-300">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent hidden xs:block">
                DevConnect
              </span>
            </Link>

            <div className="flex-1 max-w-2xl mx-2 sm:mx-4 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search posts, people, hashtags..."
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm bg-gray-800/60 backdrop-blur-sm border-gray-700/50 focus:bg-gray-800/80 focus:border-purple-500/50 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => router.push("/search")}
                />
              </div>
            </div>

            {/* Mobile Search Button - Only on mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/search")}
              className="lg:hidden"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Right Side Actions - Simplified for Mobile (Bottom Nav handles navigation) */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Desktop Only: Create Post Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push("/create-post")}
                className="hidden lg:flex"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>

              {/* Desktop Only: Theme Toggle */}
              <div className="hidden lg:block">
                <ThemeToggle />
              </div>

              {/* Desktop Only: Notifications */}
              <div className="hidden lg:block">
                <NotificationCenter />
              </div>

              {/* Desktop Only: Messages */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/chat")}
                className="relative hidden lg:flex"
              >
                <MessageCircle className="h-5 w-5" />
                {messages > 0 && (
                  <Badge
                    variant="danger"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {messages}
                  </Badge>
                )}
              </Button>

              {/* User Avatar - Always visible */}
              <div className="relative group">
                <button
                  onClick={() => {
                    // Use actual username from session
                    const username = session.user?.username ||
                      session.user?.name?.toLowerCase().replace(/\s+/g, '') ||
                      session.user?.email?.split('@')[0] ||
                      'user';
                    router.push(`/profile/${username}`);
                  }}
                  className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-800 transition"
                >
                  <RealTimeAvatar
                    userId={session.user?.id}
                    src={userAvatar || session.user?.image}
                    alt={session.user?.name || "User"}
                    size="sm"
                    status="online"
                  />
                </button>
              </div>

              {/* Desktop Only: Mobile Menu Toggle (hidden on mobile since we have bottom nav) */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="hidden md:flex lg:hidden"
              >
                {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Navigation (Desktop) - Enhanced */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64 xl:w-72 lg:pt-16">
        <div className="h-full bg-gray-900/40 backdrop-blur-xl border-r border-gray-800/50 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100vh - 4rem)' }}>
          <nav className="p-4 sm:p-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`
                            flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 group relative
                            ${isActive
                      ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-white shadow-lg shadow-purple-500/10"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    }
                          `}
                >
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${isActive ? "text-purple-400" : "group-hover:text-purple-400 transition-colors"}`} />
                  <span className="font-medium flex-1 text-sm sm:text-base truncate">{item.label}</span>
                  {item.badge && (
                    <Badge variant={typeof item.badge === "number" ? "danger" : "primary"} className="text-xs flex-shrink-0">
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-purple-500 to-blue-500 rounded-r-full"></div>
                  )}
                </Link>
              );
            })}

            <div className="pt-4 border-t border-gray-800">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Quick Actions
              </div>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={action.action}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200 group"
                  >
                    <Icon className="h-5 w-5 group-hover:text-purple-400" />
                    <span className="font-medium">{action.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-gray-800">
              <Link
                href="/settings"
                className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200 group"
              >
                <Settings className="h-5 w-5 group-hover:text-purple-400" />
                <span className="font-medium">Settings</span>
              </Link>
              <button
                onClick={() => {
                  signOut({ callbackUrl: "/login" });
                  toast.success("Logged out successfully");
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* Tablet Menu (md to lg) - Hidden on mobile phones since bottom nav is there */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 hidden md:flex lg:hidden flex-col"
          >
            {/* Fixed Header */}
            <div className="p-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">Menu</span>
                <Button variant="ghost" size="icon" onClick={() => setShowMobileMenu(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Scrollable Content */}
            <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm sm:text-base">{item.label}</span>
                    {item.badge && (
                      <Badge variant="danger" className="ml-auto flex-shrink-0">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}

              {/* Quick Actions - Tablet */}
              <div className="pt-4 border-t border-gray-800 mt-4">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Quick Actions
                </div>
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => {
                        action.action();
                        setShowMobileMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200 group"
                    >
                      <Icon className="h-5 w-5 flex-shrink-0 group-hover:text-purple-400" />
                      <span className="font-medium text-sm sm:text-base">{action.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Settings & Logout - Tablet */}
              <div className="pt-4 border-t border-gray-800 mt-4">
                <Link
                  href="/settings"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all duration-200 group"
                >
                  <Settings className="h-5 w-5 flex-shrink-0 group-hover:text-purple-400" />
                  <span className="font-medium text-sm sm:text-base">Settings</span>
                </Link>
                <button
                  onClick={() => {
                    signOut({ callbackUrl: "/login" });
                    toast.success("Logged out successfully");
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm sm:text-base">Logout</span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tablet Menu Overlay (md to lg only) */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-40 hidden md:block lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
    </>
  );
}
