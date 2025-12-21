"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  MessageCircle,
  Heart,
  Eye,
  Share2,
  BarChart3,
  Bell,
  Settings,
  Zap,
  Calendar,
  Code,
  Video,
  Bookmark,
  Award,
  Activity,
  ArrowUp,
  ArrowDown,
  Clock,
  Globe,
  Shield,
  Mail,
  Phone,
  UserPlus,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { formatNumber, formatTimeAgo } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import getSocket from "@/lib/socket";

interface DashboardClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

interface DashboardStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  followers: number;
  following: number;
  engagementRate: number;
  postsGrowth: number;
  likesGrowth: number;
  viewsGrowth: number;
}

interface RecentActivity {
  id: string;
  type: "like" | "comment" | "follow" | "post";
  user: {
    id?: string;
    name: string;
    avatar?: string;
  };
  senderId?: string;
  content: string;
  timestamp: string;
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalViews: 0,
    followers: 0,
    following: 0,
    engagementRate: 0,
    postsGrowth: 0,
    likesGrowth: 0,
    viewsGrowth: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [liveStreams, setLiveStreams] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchDashboardData();
      setupRealtimeUpdates();
    }

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off("dashboard_update");
        socket.off("new_activity");
        socket.off("user_online");
      }
    };
  }, [session]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/analytics?range=30d");
      if (res.ok) {
        const data = await res.json();
        if (data.overview) {
          setStats({
            totalPosts: data.overview.totalPosts || 0,
            totalLikes: data.overview.totalLikes || 0,
            totalComments: data.overview.totalComments || 0,
            totalShares: data.overview.totalShares || 0,
            totalViews: data.overview.totalViews || 0,
            followers: data.overview.followers || 0,
            following: data.overview.following || 0,
            engagementRate: data.engagement?.engagementRate || 0,
            postsGrowth: data.growth?.postsGrowth || 0,
            likesGrowth: data.growth?.engagementGrowth || 0,
            viewsGrowth: 0,
          });
        }
      }

      // Fetch recent activity
      const activityRes = await fetch("/api/notifications?limit=5");
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData.notifications?.slice(0, 5) || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeUpdates = () => {
    const socket = getSocket();
    if (socket) {
      socket.on("dashboard_update", (data: Partial<DashboardStats>) => {
        setStats((prev) => ({ ...prev, ...data }));
      });

      socket.on("new_activity", (activity: RecentActivity) => {
        setRecentActivity((prev) => [activity, ...prev].slice(0, 5));
      });

      socket.on("user_online", (count: number) => {
        setOnlineUsers(count);
      });

      socket.on("live_streams", (count: number) => {
        setLiveStreams(count);
      });
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: FileText, label: "Create Post", path: "/create-post", color: "from-blue-500 to-cyan-500" },
    { icon: Video, label: "Go Live", path: "/live", color: "from-red-500 to-pink-500" },
    { icon: Code, label: "Code Snippet", path: "/code-snippets", color: "from-purple-500 to-indigo-500" },
    { icon: Calendar, label: "Create Event", path: "/events", color: "from-green-500 to-emerald-500" },
  ];

  const statCards = [
    {
      label: "Total Posts",
      value: stats.totalPosts,
      icon: FileText,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      growth: stats.postsGrowth,
    },
    {
      label: "Total Likes",
      value: stats.totalLikes,
      icon: Heart,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      growth: stats.likesGrowth,
    },
    {
      label: "Total Views",
      value: stats.totalViews,
      icon: Eye,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      growth: stats.viewsGrowth,
    },
    {
      label: "Engagement Rate",
      value: `${stats.engagementRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      growth: 0,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-16 lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  Welcome back, {user?.name?.split(" ")[0] || "User"}! 👋
                </h1>
                <p className="text-muted-foreground">Here's what's happening with your account today</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="success" className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {onlineUsers} Online
                </Badge>
                {liveStreams > 0 && (
                  <Badge variant="danger" className="flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    {liveStreams} Live
                  </Badge>
                )}
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Link key={index} href={action.path}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Card
                      variant="elevated"
                      hover
                      className={`p-6 text-center cursor-pointer bg-gradient-to-br ${action.color} bg-opacity-10 border-0 hover:bg-opacity-20 transition-all`}
                    >
                      <action.icon className={`h-8 w-8 mx-auto mb-3 ${action.color.replace("text-", "text-")}`} />
                      <p className="text-foreground font-semibold text-sm">{action.label}</p>
                    </Card>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Card variant="elevated" className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    {stat.growth !== 0 && (
                      <Badge
                        variant={stat.growth > 0 ? "success" : "danger"}
                        className="flex items-center gap-1"
                      >
                        {stat.growth > 0 ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                        {Math.abs(stat.growth)}%
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-3xl font-bold text-foreground mb-1">
                    {typeof stat.value === "number" ? formatNumber(stat.value) : stat.value}
                  </h3>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2"
            >
              <Card variant="elevated" className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Activity
                  </h2>
                  <Link href="/notifications">
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
                <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  ) : (
                    recentActivity.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition"
                      >
                        <RealTimeAvatar
                          userId={activity.senderId || activity.user?.id}
                          src={activity.user?.avatar}
                          alt={activity.user?.name}
                          size="sm"
                        />
                        <div className="flex-1">
                          <p className="text-foreground text-sm">
                            <span className="font-semibold">{activity.user.name}</span>{" "}
                            {activity.type === "like" && "liked your post"}
                            {activity.type === "comment" && "commented on your post"}
                            {activity.type === "follow" && "started following you"}
                            {activity.type === "post" && "created a new post"}
                          </p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {formatTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Quick Stats & Profile */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-6"
            >
              {/* Profile Card */}
              <Card variant="elevated" className="p-6">
                <div className="text-center mb-4">
                  <RealTimeAvatar
                    userId={session?.user?.id}
                    src={session?.user?.image || user?.image}
                    alt={user?.name || "User"}
                    size="xl"
                    status="online"
                  />
                  <h3 className="text-xl font-bold text-foreground mt-4">{user?.name || "User"}</h3>
                  <p className="text-muted-foreground text-sm">{user?.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{formatNumber(stats.followers)}</p>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{formatNumber(stats.following)}</p>
                    <p className="text-xs text-muted-foreground">Following</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive/80"
                    onClick={() => {
                      signOut({ callbackUrl: "/login" });
                      toast.success("Logged out successfully");
                    }}
                  >
                    Logout
                  </Button>
                </div>
              </Card>

              {/* Security Status */}
              <Card variant="elevated" className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-400" />
                  Security Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email Verified</span>
                    <Badge variant="success">Verified</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">2FA Enabled</span>
                    <Badge variant="outline">Not Set</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Login</span>
                    <span className="text-xs text-muted-foreground">Just now</span>
                  </div>
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      Manage Security
                    </Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
