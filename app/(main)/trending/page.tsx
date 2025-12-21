"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Flame,
  Hash,
  ArrowUp,
  Clock,
  Users,
  MessageCircle,
  Heart,
  Share2,
  Eye,
  Sparkles,
  BarChart3,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { formatTimeAgo, formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";

interface TrendingPost {
  id: string;
  content: string;
  title?: string;
  hashtags?: string[];
  user: {
    id: string;
    name?: string;
    avatar?: string;
  };
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  trendScore: number;
  createdAt: string;
}

interface TrendingHashtag {
  tag: string;
  posts: number;
  growth: number;
  trend: "up" | "down";
}

interface TrendingUser {
  id: string;
  name?: string;
  username?: string;
  avatar?: string;
  followersCount: number;
  growth: number;
  verified?: boolean;
}

export default function TrendingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [trendingUsers, setTrendingUsers] = useState<TrendingUser[]>([]);
  const [timeRange, setTimeRange] = useState("24h");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchTrending();
  }, [timeRange]);

  const fetchTrending = async () => {
    try {
      const res = await fetch(`/api/trending?range=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setTrendingPosts(data.posts || []);
        setTrendingHashtags(data.hashtags || []);
        setTrendingUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching trending:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 lg:pl-72 xl:pl-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <Flame className="h-8 w-8 text-orange-400" />
                  Trending
                </h1>
                <p className="text-muted-foreground">What's hot right now</p>
              </div>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 bg-secondary/50 border border-input rounded-lg text-foreground"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="posts" className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="posts">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending Posts
              </TabsTrigger>
              <TabsTrigger value="hashtags">
                <Hash className="h-4 w-4 mr-2" />
                Hashtags
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Creators
              </TabsTrigger>
            </TabsList>

            {/* Trending Posts */}
            <TabsContent value="posts" className="mt-6">
              <div className="space-y-4">
                {trendingPosts.length === 0 ? (
                  <Card variant="default" className="p-12 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">No trending posts yet</p>
                  </Card>
                ) : (
                  trendingPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card variant="elevated" hover className="cursor-pointer">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-lg">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <RealTimeAvatar
                                userId={post.user.id}
                                src={post.user.avatar}
                                alt={post.user.name || "User"}
                                size="sm"
                              />
                              <span className="font-semibold text-foreground">
                                {post.user.name || "Anonymous"}
                              </span>
                              <Badge variant="danger" className="flex items-center gap-1">
                                <Flame className="h-3 w-3" />
                                Trending
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatTimeAgo(post.createdAt)}
                              </span>
                            </div>
                            {post.title && (
                              <h3 className="text-lg font-bold text-foreground mb-2">{post.title}</h3>
                            )}
                            <p className="text-muted-foreground mb-3 line-clamp-2">{post.content}</p>
                            {post.hashtags && post.hashtags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {post.hashtags.map((tag, idx) => (
                                  <Link
                                    key={idx}
                                    href={`/search?q=${tag.replace("#", "")}`}
                                    className="text-primary hover:text-primary/80 text-sm"
                                  >
                                    {tag.startsWith("#") ? tag : `#${tag}`}
                                  </Link>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Heart className="h-4 w-4" />
                                {formatNumber(post.likesCount)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-4 w-4" />
                                {formatNumber(post.commentsCount)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Share2 className="h-4 w-4" />
                                {formatNumber(post.sharesCount)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                {formatNumber(post.viewsCount)}
                              </span>
                              <Badge variant="primary" className="ml-auto">
                                Score: {post.trendScore}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Trending Hashtags */}
            <TabsContent value="hashtags" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingHashtags.length === 0 ? (
                  <Card variant="default" className="p-12 text-center col-span-full">
                    <Hash className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">No trending hashtags yet</p>
                  </Card>
                ) : (
                  trendingHashtags.map((hashtag, index) => (
                    <motion.div
                      key={hashtag.tag}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card variant="elevated" hover className="cursor-pointer">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                              <Hash className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-bold text-foreground text-lg">#{hashtag.tag}</h3>
                              <p className="text-sm text-muted-foreground">
                                {formatNumber(hashtag.posts)} posts
                              </p>
                            </div>
                          </div>
                          {hashtag.trend === "up" && (
                            <Badge variant="success" className="flex items-center gap-1">
                              <ArrowUp className="h-3 w-3" />
                              +{hashtag.growth}%
                            </Badge>
                          )}
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(hashtag.growth, 100)}%` }}
                          />
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Trending Users */}
            <TabsContent value="users" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingUsers.length === 0 ? (
                  <Card variant="default" className="p-12 text-center col-span-full">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">No trending creators yet</p>
                  </Card>
                ) : (
                  trendingUsers.map((user, index) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card variant="elevated" hover className="cursor-pointer">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative">
                            <RealTimeAvatar
                              userId={user.id}
                              src={user.avatar}
                              alt={user.name || "User"}
                              size="lg"
                            />
                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white text-xs font-bold">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-foreground">{user.name || "User"}</h3>
                              {user.verified && (
                                <Badge variant="success" className="text-xs">Verified</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">@{user.username || user.id}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatNumber(user.followersCount)} followers
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          {user.growth > 0 && (
                            <Badge variant="success" className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              +{user.growth}% growth
                            </Badge>
                          )}
                          <Button variant="primary" size="sm">
                            Follow
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}


