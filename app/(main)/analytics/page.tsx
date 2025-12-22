"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Users,
  Calendar,
  ArrowUp,
  ArrowDown,
  Download,
  Filter,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";

interface Analytics {
  overview: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalViews: number;
    followers: number;
    following: number;
  };
  engagement: {
    avgLikes: number;
    avgComments: number;
    avgShares: number;
    engagementRate: number;
  };
  growth: {
    followersGrowth: number;
    postsGrowth: number;
    engagementGrowth: number;
  };
  topPosts: Array<{
    id: string;
    content: string;
    likes: number;
    comments: number;
    shares: number;
    views: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session, timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${timeRange}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="lg:pl-72 xl:pl-80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No analytics data available</p>
            </div>
          </div>
        </div>
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2 flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  Analytics
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">Track your performance and engagement</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-secondary/50 border border-input rounded-lg text-sm sm:text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
                <Button variant="outline" size="sm" className="whitespace-nowrap">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card variant="elevated" className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Posts</span>
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-foreground">
                  {formatNumber(analytics.overview.totalPosts)}
                </h3>
                {analytics.growth.postsGrowth > 0 && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    {analytics.growth.postsGrowth}%
                  </Badge>
                )}
              </div>
            </Card>

            <Card variant="elevated" className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Likes</span>
                <Heart className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-foreground">
                  {formatNumber(analytics.overview.totalLikes)}
                </h3>
                {analytics.growth.engagementGrowth > 0 && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    {analytics.growth.engagementGrowth}%
                  </Badge>
                )}
              </div>
            </Card>

            <Card variant="elevated" className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Views</span>
                <Eye className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {formatNumber(analytics.overview.totalViews)}
              </h3>
            </Card>

            <Card variant="elevated" className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Engagement Rate</span>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">
                {analytics.engagement.engagementRate.toFixed(1)}%
              </h3>
            </Card>
          </div>

          {/* Engagement Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card variant="elevated" className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Engagement Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg Likes per Post</span>
                  <span className="font-semibold text-foreground">
                    {formatNumber(analytics.engagement.avgLikes)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg Comments per Post</span>
                  <span className="font-semibold text-foreground">
                    {formatNumber(analytics.engagement.avgComments)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg Shares per Post</span>
                  <span className="font-semibold text-foreground">
                    {formatNumber(analytics.engagement.avgShares)}
                  </span>
                </div>
              </div>
            </Card>

            <Card variant="elevated" className="p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Growth</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Followers Growth</span>
                  <div className="flex items-center gap-2">
                    {analytics.growth.followersGrowth > 0 ? (
                      <>
                        <ArrowUp className="h-4 w-4 text-green-500" />
                        <span className="font-semibold text-green-500">
                          +{analytics.growth.followersGrowth}%
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-4 w-4 text-red-500" />
                        <span className="font-semibold text-red-500">
                          {analytics.growth.followersGrowth}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Posts Growth</span>
                  <div className="flex items-center gap-2">
                    {analytics.growth.postsGrowth > 0 ? (
                      <>
                        <ArrowUp className="h-4 w-4 text-green-500" />
                        <span className="font-semibold text-green-500">
                          +{analytics.growth.postsGrowth}%
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-4 w-4 text-red-500" />
                        <span className="font-semibold text-red-500">
                          {analytics.growth.postsGrowth}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card variant="elevated" className="overflow-hidden">
            <div className="p-4 sm:p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Top Performing Posts</h3>
              <div className="space-y-4">
                {analytics.topPosts.map((post, index) => (
                  <div
                    key={post.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/50 rounded-lg gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 w-full min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <p className="text-muted-foreground flex-1 line-clamp-2 sm:line-clamp-1 break-words">
                        {post.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-muted">
                      <span className="flex items-center gap-1 group truncate" title="Likes">
                        <Heart className="h-4 w-4 text-red-500/70 group-hover:text-red-500 transition-colors" />
                        {formatNumber(post.likes)}
                      </span>
                      <span className="flex items-center gap-1 group truncate" title="Comments">
                        <MessageCircle className="h-4 w-4 text-blue-500/70 group-hover:text-blue-500 transition-colors" />
                        {formatNumber(post.comments)}
                      </span>
                      <span className="flex items-center gap-1 group truncate" title="Shares">
                        <Share2 className="h-4 w-4 text-purple-500/70 group-hover:text-purple-500 transition-colors" />
                        {formatNumber(post.shares)}
                      </span>
                      <span className="flex items-center gap-1 group truncate" title="Views">
                        <Eye className="h-4 w-4 text-gray-500/70 group-hover:text-gray-500 transition-colors" />
                        {formatNumber(post.views)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
