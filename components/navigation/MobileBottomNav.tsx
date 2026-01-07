"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Search,
  PlusSquare,
  Heart,
  MessageCircle,
  User,
  Video,
  Compass,
  Bell,
  Menu,
  X,
  Users,
  Calendar,
  TrendingUp,
  Bookmark,
  Settings,
  BarChart3,
  Code,
  Sparkles,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import getSocket from "@/lib/socket";
import { signOut } from "next-auth/react";
import { Badge } from "@/components/ui/badge";

// Context for navigation visibility
import { useNavigationVisibility } from "@/lib/navigation-context";

const navItems = [
  { icon: Home, label: "Home", path: "/feed", activeColor: "from-purple-500 to-blue-500" },
  { icon: Compass, label: "Explore", path: "/explore", activeColor: "from-pink-500 to-orange-500" },
  { icon: PlusSquare, label: "Create", path: "create", activeColor: "from-green-500 to-emerald-500", isAction: true },
  { icon: MessageCircle, label: "Chat", path: "/chat", activeColor: "from-cyan-500 to-blue-500" },
  { icon: Menu, label: "More", path: "more", activeColor: "from-indigo-500 to-purple-500", isAction: true },
];

// All features organized by category
const allFeatures = {
  main: [
    { icon: Home, label: "Home Feed", path: "/feed", color: "from-purple-500 to-blue-500" },
    { icon: Compass, label: "Explore", path: "/explore", color: "from-pink-500 to-orange-500" },
    { icon: Bell, label: "Notifications", path: "/notifications", color: "from-yellow-500 to-amber-500" },
    { icon: MessageCircle, label: "Messages", path: "/chat", color: "from-cyan-500 to-blue-500" },
  ],
  social: [
    { icon: Users, label: "Groups", path: "/groups", color: "from-green-500 to-emerald-500" },
    { icon: Calendar, label: "Events", path: "/events", color: "from-blue-500 to-indigo-500" },
    { icon: Video, label: "Live Streaming", path: "/live", color: "from-red-500 to-pink-500" },
    { icon: TrendingUp, label: "Trending", path: "/trending", color: "from-orange-500 to-red-500" },
  ],
  content: [
    { icon: Code, label: "Code Snippets", path: "/code-snippets", color: "from-violet-500 to-purple-500" },
    { icon: Bookmark, label: "Saved Posts", path: "/saved", color: "from-amber-500 to-yellow-500" },
    { icon: Sparkles, label: "Recommendations", path: "/recommendations", color: "from-teal-500 to-cyan-500" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", color: "from-indigo-500 to-blue-500" },
  ],
  account: [
    { icon: User, label: "Profile", path: "/profile", color: "from-gray-500 to-gray-600" },
    { icon: Settings, label: "Settings", path: "/settings", color: "from-slate-500 to-gray-500" },
  ],
};

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { isBottomNavHidden } = useNavigationVisibility();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);

  // Fetch unread counts
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchUnreadCounts = async () => {
      try {
        // Fetch unread messages
        const msgRes = await fetch("/api/messages");
        if (msgRes.ok) {
          const data = await msgRes.json();
          const count = data.chats?.reduce((acc: number, chat: any) => acc + (chat.unreadCount || 0), 0) || 0;
          setUnreadMessages(count);
        }

        // Fetch unread notifications
        const notifRes = await fetch("/api/notifications");
        if (notifRes.ok) {
          const data = await notifRes.json();
          const unread = data.notifications?.filter((n: any) => !n.read).length || 0;
          setUnreadNotifications(unread);
        }
      } catch (error) {
        console.error("Error fetching unread counts:", error);
      }
    };

    fetchUnreadCounts();

    // Socket listeners for real-time updates
    const socket = getSocket();
    if (socket) {
      socket.on("new_message", () => {
        setUnreadMessages(prev => prev + 1);
      });
      socket.on("notification", () => {
        setUnreadNotifications(prev => prev + 1);
      });
      socket.on("messages_read", () => {
        fetchUnreadCounts();
      });
    }

    return () => {
      if (socket) {
        socket.off("new_message");
        socket.off("notification");
        socket.off("messages_read");
      }
    };
  }, [session?.user?.id]);

  // Don't show on login/register pages
  if (!session || pathname?.startsWith("/login") || pathname?.startsWith("/register")) {
    return null;
  }

  // Don't show on desktop (handled by CSS, but also here for safety)
  const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent<HTMLButtonElement>) => {
    // Create ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipple({ x, y, key: Date.now() });
    setTimeout(() => setRipple(null), 600);

    if (item.isAction) {
      if (item.path === "create") {
        setShowCreateMenu(true);
      } else if (item.path === "more") {
        setShowMoreMenu(true);
      }
    } else {
      router.push(item.path);
    }
  };

  const createMenuItems = [
    { icon: PlusSquare, label: "New Post", path: "/create-post", color: "from-purple-500 to-blue-500" },
    { icon: Video, label: "Go Live", path: "/live", color: "from-red-500 to-pink-500" },
  ];

  const getUnreadCount = (path: string) => {
    if (path === "/chat") return unreadMessages;
    if (path === "/notifications") return unreadNotifications;
    return 0;
  };

  // Hide bottom nav when specified (e.g., when in chat)
  if (isBottomNavHidden) {
    return null;
  }

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        {/* Blur backdrop */}
        <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-xl border-t border-gray-800/50" />
        
        {/* Safe area padding for iOS */}
        <div className="relative px-2 pb-safe">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (item.path === "/feed" && pathname === "/");
              const unreadCount = getUnreadCount(item.path);

              return (
                <motion.button
                  key={item.path}
                  onClick={(e) => handleNavClick(item, e)}
                  className={`relative flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 overflow-hidden ${
                    isActive ? "bg-white/5" : "hover:bg-white/5"
                  }`}
                  whileTap={{ scale: 0.9 }}
                >
                  {/* Ripple Effect */}
                  <AnimatePresence>
                    {ripple && (
                      <motion.span
                        key={ripple.key}
                        className="absolute rounded-full bg-white/20 pointer-events-none"
                        initial={{ width: 0, height: 0, opacity: 1 }}
                        animate={{ width: 100, height: 100, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                          left: ripple.x - 50,
                          top: ripple.y - 50,
                        } as React.CSSProperties}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className={`absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r ${item.activeColor}`}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}

                  {/* Icon with badge */}
                  <div className="relative">
                    {item.isAction ? (
                      <motion.div
                        className={`p-2 rounded-xl bg-gradient-to-r ${item.activeColor}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                      </motion.div>
                    ) : (
                      <>
                        <Icon
                          className={`h-6 w-6 transition-all duration-300 ${
                            isActive
                              ? "text-white"
                              : "text-gray-400 group-hover:text-gray-300"
                          }`}
                          strokeWidth={isActive ? 2.5 : 1.8}
                          fill={isActive ? "currentColor" : "none"}
                        />
                        
                        {/* Unread badge */}
                        {unreadCount > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg shadow-red-500/30"
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </motion.span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-[10px] mt-1 font-medium transition-colors ${
                      isActive ? "text-white" : "text-gray-500"
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Create Menu Overlay */}
      <AnimatePresence>
        {showCreateMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateMenu(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-20 left-4 right-4 z-50 lg:hidden"
            >
              <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-gray-800/50 p-4 shadow-2xl shadow-purple-500/10">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white">Create Something</h3>
                  <p className="text-sm text-gray-400">What would you like to share?</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {createMenuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.path}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => {
                          setShowCreateMenu(false);
                          router.push(item.path);
                        }}
                        className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 transition-all group"
                      >
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${item.color} mb-3 group-hover:scale-110 transition-transform`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-white font-medium">{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>

                <motion.button
                  onClick={() => setShowCreateMenu(false)}
                  className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* More Menu Drawer - Full Features Access */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreMenu(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden"
            />

            {/* Drawer from Right */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-gray-950 z-50 lg:hidden overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-purple-900/20 to-indigo-900/20">
                <div>
                  <h2 className="text-xl font-bold text-white">DevConnect</h2>
                  <p className="text-xs text-gray-400 mt-1">Explore all features</p>
                </div>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User Info */}
              <div className="flex-shrink-0 p-4 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-3">
                  <RealTimeAvatar
                    userId={session?.user?.id}
                    src={session?.user?.image}
                    alt={session?.user?.name || "User"}
                    className="h-12 w-12"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{session?.user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{session?.user?.email}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                </div>
              </div>

              {/* Scrollable Menu */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Main Features */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Main</h3>
                  <div className="space-y-1">
                    {allFeatures.main.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.path || (item.path === "/feed" && pathname === "/");
                      const unread = item.path === "/notifications" ? unreadNotifications : item.path === "/chat" ? unreadMessages : 0;
                      
                      return (
                        <motion.button
                          key={item.path}
                          onClick={() => {
                            setShowMoreMenu(false);
                            router.push(item.path);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            isActive
                              ? "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-white"
                              : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                          }`}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className={`p-2 rounded-lg ${isActive ? `bg-gradient-to-r ${item.color}` : "bg-gray-800"}`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className="flex-1 text-left font-medium">{item.label}</span>
                          {unread > 0 && (
                            <Badge className="bg-red-500 text-white text-xs px-2">
                              {unread > 99 ? "99+" : unread}
                            </Badge>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Social Features */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Social</h3>
                  <div className="space-y-1">
                    {allFeatures.social.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.path;
                      
                      return (
                        <motion.button
                          key={item.path}
                          onClick={() => {
                            setShowMoreMenu(false);
                            router.push(item.path);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            isActive
                              ? "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-white"
                              : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                          }`}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className={`p-2 rounded-lg ${isActive ? `bg-gradient-to-r ${item.color}` : "bg-gray-800"}`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className="flex-1 text-left font-medium">{item.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Content Features */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Content</h3>
                  <div className="space-y-1">
                    {allFeatures.content.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.path;
                      
                      return (
                        <motion.button
                          key={item.path}
                          onClick={() => {
                            setShowMoreMenu(false);
                            router.push(item.path);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            isActive
                              ? "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-white"
                              : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                          }`}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className={`p-2 rounded-lg ${isActive ? `bg-gradient-to-r ${item.color}` : "bg-gray-800"}`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className="flex-1 text-left font-medium">{item.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Account Features */}
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Account</h3>
                  <div className="space-y-1">
                    {allFeatures.account.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.path;
                      
                      return (
                        <motion.button
                          key={item.path}
                          onClick={() => {
                            setShowMoreMenu(false);
                            router.push(item.path);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            isActive
                              ? "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-white"
                              : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                          }`}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className={`p-2 rounded-lg ${isActive ? `bg-gradient-to-r ${item.color}` : "bg-gray-800"}`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className="flex-1 text-left font-medium">{item.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer - Logout */}
              <div className="flex-shrink-0 p-4 border-t border-gray-800 bg-gray-900/50">
                <motion.button
                  onClick={async () => {
                    setShowMoreMenu(false);
                    await signOut({ callbackUrl: "/login" });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                  whileTap={{ scale: 0.98 }}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="flex-1 text-left font-medium">Sign Out</span>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for content */}
      <div className="h-16 lg:hidden" />
    </>
  );
}
