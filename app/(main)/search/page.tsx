"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Users,
  Hash,
  FileText,
  Image as ImageIcon,
  Video,
  Code,
  Calendar,
  TrendingUp,
  X,
  Clock,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { formatTimeAgo, formatNumber, debounce } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";

interface SearchResult {
  type: "post" | "user" | "hashtag" | "group" | "event";
  id: string;
  title?: string;
  content?: string;
  name?: string;
  username?: string;
  avatar?: string;
  hashtag?: string;
  postsCount?: number;
  followersCount?: number;
  verified?: boolean;
  createdAt?: string;
  likesCount?: number;
  commentsCount?: number;
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({
    type: "all",
    dateRange: "all",
    sortBy: "relevance",
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const recent = localStorage.getItem("recentSearches");
    if (recent) {
      setRecentSearches(JSON.parse(recent));
    }
    fetchTrendingSearches();
  }, []);

  useEffect(() => {
    if (query.trim()) {
      debouncedSearch(query);
    } else {
      setResults([]);
    }
  }, [query, filters]);

  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          q: searchQuery,
          type: filters.type,
          dateRange: filters.dateRange,
          sortBy: filters.sortBy,
        });
        const res = await fetch(`/api/search?${params}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);

          // Save to recent searches
          const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
          if (!recent.includes(searchQuery)) {
            const updated = [searchQuery, ...recent].slice(0, 10);
            localStorage.setItem("recentSearches", JSON.stringify(updated));
            setRecentSearches(updated);
          }
        }
      } catch (error) {
        console.error("Error searching:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [filters]
  );

  const fetchTrendingSearches = async () => {
    try {
      const res = await fetch("/api/search/trending");
      if (res.ok) {
        const data = await res.json();
        setTrendingSearches(data.searches || []);
      }
    } catch (error) {
      console.error("Error fetching trending searches:", error);
    }
  };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const clearRecentSearches = () => {
    localStorage.removeItem("recentSearches");
    setRecentSearches([]);
  };

  const filteredResults = results.filter((result) => {
    if (activeTab === "all") return true;
    return result.type === activeTab;
  });

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
          {/* Search Header */}
          <div className="mb-8">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search posts, people, hashtags, groups..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg bg-secondary/50 border-input"
                autoFocus
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="px-4 py-2 bg-secondary/50 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Types</option>
                <option value="post">Posts</option>
                <option value="user">Users</option>
                <option value="hashtag">Hashtags</option>
                <option value="group">Groups</option>
                <option value="event">Events</option>
              </select>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="px-4 py-2 bg-secondary/50 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Time</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="px-4 py-2 bg-secondary/50 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="relevance">Relevance</option>
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>

          {/* Results or Suggestions */}
          {!query.trim() ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <Card variant="elevated" className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Recent Searches
                    </h3>
                    <Button variant="ghost" size="sm" onClick={clearRecentSearches}>
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {recentSearches.map((search, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSearch(search)}
                        className="w-full text-left px-4 py-2 rounded-lg hover:bg-muted/50 transition flex items-center justify-between"
                      >
                        <span className="text-muted-foreground">{search}</span>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Trending Searches */}
              {trendingSearches.length > 0 && (
                <Card variant="elevated" className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Trending Searches
                  </h3>
                  <div className="space-y-2">
                    {trendingSearches.map((search, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSearch(search)}
                        className="w-full text-left px-4 py-2 rounded-lg hover:bg-muted/50 transition flex items-center justify-between"
                      >
                        <span className="text-muted-foreground">{search}</span>
                        <Badge variant="primary" className="text-xs">
                          #{idx + 1}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <>
              {/* Tabs */}
              <Tabs defaultValue="all" className="mb-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="post">Posts</TabsTrigger>
                  <TabsTrigger value="user">Users</TabsTrigger>
                  <TabsTrigger value="hashtag">Hashtags</TabsTrigger>
                  <TabsTrigger value="group">Groups</TabsTrigger>
                </TabsList>

                {/* All Results */}
                <TabsContent value="all" className="mt-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : filteredResults.length === 0 ? (
                    <Card variant="default" className="p-12 text-center">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                      <p className="text-muted-foreground">No results found</p>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {filteredResults.map((result, index) => (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                          <SearchResultCard result={result} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ... other tabs content ... */}
                {/* Posts */}
                <TabsContent value="post" className="mt-6">
                  <SearchResultsList
                    results={filteredResults.filter((r) => r.type === "post")}
                    isLoading={isLoading}
                  />
                </TabsContent>

                {/* Users */}
                <TabsContent value="user" className="mt-6">
                  <SearchResultsList
                    results={filteredResults.filter((r) => r.type === "user")}
                    isLoading={isLoading}
                  />
                </TabsContent>

                {/* Hashtags */}
                <TabsContent value="hashtag" className="mt-6">
                  <SearchResultsList
                    results={filteredResults.filter((r) => r.type === "hashtag")}
                    isLoading={isLoading}
                  />
                </TabsContent>

                {/* Groups */}
                <TabsContent value="group" className="mt-6">
                  <SearchResultsList
                    results={filteredResults.filter((r) => r.type === "group")}
                    isLoading={isLoading}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  if (result.type === "user") {
    return (
      <Card variant="elevated" hover className="cursor-pointer">
        <Link href={`/profile/${result.username || result.id}`}>
          <div className="flex items-center gap-4 p-4">
            <RealTimeAvatar
              userId={result.id}
              src={result.avatar}
              alt={result.name || "User"}
              size="lg"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-foreground">{result.name || "User"}</h3>
                {result.verified && (
                  <Badge variant="success" className="text-xs">Verified</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">@{result.username || result.id}</p>
              {result.followersCount !== undefined && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formatNumber(result.followersCount)} followers
                </p>
              )}
            </div>
          </div>
        </Link>
      </Card>
    );
  }

  if (result.type === "hashtag") {
    return (
      <Card variant="elevated" hover className="cursor-pointer">
        <Link href={`/explore?hashtag=${result.hashtag?.replace("#", "")}`}>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg">
                <Hash className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">#{result.hashtag}</h3>
                {result.postsCount !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    {formatNumber(result.postsCount)} posts
                  </p>
                )}
              </div>
            </div>
            <Badge variant="primary">Trending</Badge>
          </div>
        </Link>
      </Card>
    );
  }

  if (result.type === "post") {
    return (
      <Card variant="elevated" hover className="cursor-pointer">
        <Link href={`/feed?post=${result.id}`}>
          <div className="p-4">
            {result.title && (
              <h3 className="font-bold text-foreground mb-2">{result.title}</h3>
            )}
            <p className="text-muted-foreground mb-3 line-clamp-2">{result.content}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {formatNumber(result.likesCount || 0)}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {formatNumber(result.commentsCount || 0)}
              </span>
              {result.createdAt && (
                <span className="ml-auto">{formatTimeAgo(result.createdAt)}</span>
              )}
            </div>
          </div>
        </Link>
      </Card>
    );
  }

  return null;
}

function SearchResultsList({
  results,
  isLoading,
}: {
  results: SearchResult[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Card variant="default" className="p-12 text-center">
        <Search className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
        <p className="text-gray-400">No results found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result, index) => (
        <motion.div
          key={result.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <SearchResultCard result={result} />
        </motion.div>
      ))}
    </div>
  );
}
