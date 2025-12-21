"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Users,
  TrendingUp,
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  Hash,
  Zap,
  Star,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

interface Recommendation {
  id: string;
  type: "user" | "post" | "hashtag" | "group";
  title?: string;
  name?: string;
  username?: string;
  avatar?: string;
  content?: string;
  hashtag?: string;
  reason: string;
  score: number;
  followersCount?: number;
  postsCount?: number;
  likesCount?: number;
  verified?: boolean;
}

export default function RecommendationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchRecommendations();
  }, [activeTab]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.append("type", activeTab);

      const res = await fetch(`/api/recommendations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        toast.success("Following!");
        fetchRecommendations();
      }
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("Failed to follow");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredRecommendations = recommendations.filter((rec) => {
    if (activeTab === "all") return true;
    return rec.type === activeTab;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 lg:pl-72 xl:pl-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-yellow-500" />
              Recommendations
            </h1>
            <p className="text-muted-foreground">
              Personalized suggestions based on your interests and activity
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all" className="mb-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="user">People</TabsTrigger>
              <TabsTrigger value="post">Posts</TabsTrigger>
              <TabsTrigger value="hashtag">Hashtags</TabsTrigger>
            </TabsList>

            {/* All Recommendations */}
            <TabsContent value="all" className="mt-6">
              <RecommendationsList
                recommendations={filteredRecommendations}
                isLoading={isLoading}
                onFollow={handleFollow}
              />
            </TabsContent>

            {/* Users */}
            <TabsContent value="user" className="mt-6">
              <RecommendationsList
                recommendations={filteredRecommendations.filter((r) => r.type === "user")}
                isLoading={isLoading}
                onFollow={handleFollow}
              />
            </TabsContent>

            {/* Posts */}
            <TabsContent value="post" className="mt-6">
              <RecommendationsList
                recommendations={filteredRecommendations.filter((r) => r.type === "post")}
                isLoading={isLoading}
                onFollow={handleFollow}
              />
            </TabsContent>

            {/* Hashtags */}
            <TabsContent value="hashtag" className="mt-6">
              <RecommendationsList
                recommendations={filteredRecommendations.filter((r) => r.type === "hashtag")}
                isLoading={isLoading}
                onFollow={handleFollow}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function RecommendationsList({
  recommendations,
  isLoading,
  onFollow,
}: {
  recommendations: Recommendation[];
  isLoading: boolean;
  onFollow: (userId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card variant="default" className="p-12 text-center">
        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <p className="text-muted-foreground">No recommendations available</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recommendations.map((rec, index) => (
        <motion.div
          key={rec.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card variant="elevated" hover className="relative">
            {/* Recommendation Badge */}
            <div className="absolute top-4 right-4">
              <Badge variant="primary" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                {Math.round(rec.score * 100)}% match
              </Badge>
            </div>

            {rec.type === "user" && (
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <RealTimeAvatar
                    userId={rec.id}
                    src={rec.avatar}
                    alt={rec.name || "User"}
                    size="lg"
                    status="offline"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-foreground">{rec.name || "User"}</h3>
                      {rec.verified && (
                        <Badge variant="success" className="text-xs">Verified</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">@{rec.username || rec.id}</p>
                    {rec.followersCount !== undefined && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatNumber(rec.followersCount)} followers
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{rec.reason}</p>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => onFollow(rec.id)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Follow
                </Button>
              </div>
            )}

            {rec.type === "post" && (
              <div className="p-6">
                {rec.title && (
                  <h3 className="font-bold text-foreground mb-2">{rec.title}</h3>
                )}
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{rec.content}</p>
                <p className="text-sm text-muted-foreground mb-4">{rec.reason}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {formatNumber(rec.likesCount || 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    Comments
                  </span>
                </div>
                <Link href={`/feed?post=${rec.id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    View Post
                  </Button>
                </Link>
              </div>
            )}

            {rec.type === "hashtag" && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg">
                    <Hash className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">#{rec.hashtag}</h3>
                    {rec.postsCount !== undefined && (
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(rec.postsCount)} posts
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{rec.reason}</p>
                <Link href={`/explore?hashtag=${rec.hashtag}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Explore
                  </Button>
                </Link>
              </div>
            )}

            {rec.type === "group" && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <RealTimeAvatar src={rec.avatar} alt={rec.name || "Group"} size="lg" />
                  <div>
                    <h3 className="font-bold text-foreground">{rec.name || "Group"}</h3>
                    {rec.followersCount !== undefined && (
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(rec.followersCount)} members
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{rec.content}</p>
                <p className="text-sm text-muted-foreground mb-4">{rec.reason}</p>
                <Link href={`/groups/${rec.id}`}>
                  <Button variant="primary" size="sm" className="w-full">
                    Join Group
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );
}


