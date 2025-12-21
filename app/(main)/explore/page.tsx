"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Hash,
  Users,
  Clock,
  Flame,
  Sparkles,
  ArrowUp,
  MessageCircle,
  Heart,
  Share2,
  Bookmark,
  MoreHorizontal,
  Filter,
  Search,
  Grid3x3,
  List,
  Image as ImageIcon,
  Video,
  Music,
  Code,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function ExplorePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("trending");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [trendingHashtags, setTrendingHashtags] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [trendingUsers, setTrendingUsers] = useState<any[]>([]);
  const [latestPosts, setLatestPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchExploreData = async () => {
      try {
        const res = await fetch("/api/explore");
        if (res.ok) {
          const data = await res.json();
          setTrendingHashtags(data.trendingHashtags);
          setTrendingPosts(data.trendingPosts);
          setTrendingUsers(data.trendingUsers);
          setLatestPosts(data.latestPosts);
        }
      } catch (error) {
        console.error("Error fetching explore data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchExploreData();
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Navbar />
      <div className="pt-16 lg:pl-72 xl:pl-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 flex items-center gap-2">
                  <Search className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
                  Explore
                </h1>
                <p className="text-sm sm:text-base text-gray-400">Discover trending content, hashtags, and creators</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search hashtags, users, posts..."
                className="pl-10 bg-gray-800/50 border-gray-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="trending" className="mb-4 sm:mb-6">
            <TabsList className="w-full flex sm:grid sm:grid-cols-4 gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide p-1 bg-gray-800/30 rounded-lg sm:rounded-xl border border-gray-700/30">
              <TabsTrigger 
                value="trending" 
                className="flex-shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm min-w-[80px] sm:min-w-0"
              >
                <TrendingUp className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Trending</span>
              </TabsTrigger>
              <TabsTrigger 
                value="hashtags" 
                className="flex-shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm min-w-[80px] sm:min-w-0"
              >
                <Hash className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Hashtags</span>
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="flex-shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm min-w-[80px] sm:min-w-0"
              >
                <Users className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Creators</span>
              </TabsTrigger>
              <TabsTrigger 
                value="latest" 
                className="flex-shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm min-w-[80px] sm:min-w-0"
              >
                <Clock className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Latest</span>
              </TabsTrigger>
            </TabsList>

            {/* Trending Content */}
            <TabsContent value="trending" className="mt-4 sm:mt-6">
              {trendingPosts.length === 0 ? (
                <div className="text-center text-gray-400 py-10">No trending posts yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {trendingPosts.map((post) => (
                    <Card key={post.id} variant="elevated" hover className="cursor-pointer">
                      <div className="flex items-start gap-3 mb-3">
                        <RealTimeAvatar
                          userId={post.user.id}
                          src={post.user.avatar}
                          size="sm"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">{post.user.name}</span>
                            {post.user.verified && <Badge variant="success" className="text-xs">Verified</Badge>}
                          </div>
                          {/* Use simple date formatting for simplicity */}
                          <p className="text-sm text-gray-400">{new Date(post.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="text-white mb-3 line-clamp-3">{post.content}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {post.likesCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          {post.commentsCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="h-4 w-4" />
                          {post.sharesCount}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Trending Hashtags */}
            <TabsContent value="hashtags" className="mt-4 sm:mt-6">
              {trendingHashtags.length === 0 ? (
                <div className="text-center text-gray-400 py-10">No trending hashtags yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {trendingHashtags.map((hashtag) => (
                    <Card
                      key={hashtag.tag}
                      variant="elevated"
                      hover
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg">
                            <Hash className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-lg">#{hashtag.tag}</h3>
                            <p className="text-sm text-gray-400">{hashtag.posts.toLocaleString()} posts</p>
                          </div>
                        </div>
                        <Badge variant="success" className="flex items-center gap-1">
                          <ArrowUp className="h-3 w-3" />
                          Trending
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Trending Users */}
            <TabsContent value="users" className="mt-4 sm:mt-6">
              {trendingUsers.length === 0 ? (
                <div className="text-center text-gray-400 py-10">No trending creators yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {trendingUsers.map((user) => (
                    <Card key={user.id} variant="elevated" hover className="cursor-pointer">
                      <div className="flex items-center gap-4">
                        <RealTimeAvatar
                          userId={user.id}
                          src={user.avatar}
                          size="lg"
                          status="offline"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">{user.name}</span>
                            {user.verified && <Badge variant="primary">Pro</Badge>}
                          </div>
                          <p className="text-sm text-gray-400 mb-2">@{user.username || "user"}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{user.followersCount} followers</span>
                            <span>•</span>
                            <span>{user.postsCount} posts</span>
                          </div>
                        </div>
                        {/* Placeholder follow button */}
                        <Button variant="primary" size="sm">
                          View
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Latest Content */}
            <TabsContent value="latest" className="mt-4 sm:mt-6">
              {latestPosts.length === 0 ? (
                <div className="text-center text-gray-400 py-10">No recent posts.</div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {latestPosts.map((post) => (
                    <Card key={post.id} variant="elevated" hover className="cursor-pointer">
                      <div className="flex gap-4">
                        <RealTimeAvatar
                          userId={post.user.id}
                          src={post.user.avatar}
                          size="md"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-white">{post.user.name}</span>
                            <span className="text-sm text-gray-400">• {new Date(post.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-white mb-3">{post.content}</p>
                          <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm">
                              <Heart className="h-4 w-4 mr-1" />
                              Like ({post.likesCount})
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MessageCircle className="h-4 w-4 mr-1" />
                              Comment ({post.commentsCount})
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
