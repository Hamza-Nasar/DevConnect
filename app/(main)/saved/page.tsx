"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  Search,
  Filter,
  Grid3x3,
  List,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  X,
  Archive,
  Tag,
} from "lucide-react";
import Navbar from "@/components/navbar/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { formatTimeAgo, formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

interface SavedPost {
  id: string;
  postId: string;
  post: {
    id: string;
    title?: string;
    content: string;
    images?: string[];
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
    createdAt: string;
  };
  savedAt: string;
  tags?: string[];
}

export default function SavedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<SavedPost[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchSavedPosts();
  }, []);

  useEffect(() => {
    let filtered = savedPosts;

    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.post.hashtags?.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    if (selectedTag) {
      filtered = filtered.filter(
        (item) => item.tags?.includes(selectedTag)
      );
    }

    setFilteredPosts(filtered);
  }, [searchQuery, selectedTag, savedPosts]);

  useEffect(() => {
    const allTags = new Set<string>();
    savedPosts.forEach((item) => {
      item.tags?.forEach((tag) => allTags.add(tag));
    });
    setTags(Array.from(allTags));
  }, [savedPosts]);

  const fetchSavedPosts = async () => {
    try {
      const res = await fetch("/api/bookmarks");
      if (res.ok) {
        const data = await res.json();
        setSavedPosts(data.bookmarks || []);
      }
    } catch (error) {
      console.error("Error fetching saved posts:", error);
    }
  };

  const handleUnsave = async (postId: string) => {
    try {
      const res = await fetch("/api/bookmarks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      if (res.ok) {
        setSavedPosts((prev) => prev.filter((item) => item.postId !== postId));
        toast.success("Removed from saved");
      }
    } catch (error) {
      console.error("Error unsaving post:", error);
      toast.error("Failed to remove");
    }
  };

  if (status === "loading") {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                  <BookmarkCheck className="h-8 w-8 text-yellow-400" />
                  Saved Posts
                </h1>
                <p className="text-gray-400">
                  {savedPosts.length} {savedPosts.length === 1 ? "post" : "posts"} saved
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                >
                  {viewMode === "grid" ? <List className="h-5 w-5" /> : <Grid3x3 className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search saved posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-700"
              />
            </div>

            {/* Tags Filter */}
            {tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="text-sm text-gray-400">Filter by tag:</span>
                <Button
                  variant={selectedTag === null ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(null)}
                >
                  All
                </Button>
                {tags.map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTag === tag ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTag(tag)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Saved Posts */}
          {filteredPosts.length === 0 ? (
            <Card variant="default" className="p-12 text-center">
              <Bookmark className="h-16 w-16 mx-auto mb-4 opacity-50 text-gray-400" />
              <h3 className="text-xl font-bold text-white mb-2">
                {savedPosts.length === 0 ? "No saved posts yet" : "No posts match your search"}
              </h3>
              <p className="text-gray-400">
                {savedPosts.length === 0
                  ? "Start saving posts to see them here"
                  : "Try adjusting your search or filters"}
              </p>
            </Card>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "space-y-4"
              }
            >
              {filteredPosts.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card variant="elevated" hover className="overflow-hidden relative group">
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUnsave(item.postId)}
                        className="bg-gray-900/80 hover:bg-red-500/20"
                      >
                        <X className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>

                    {item.post.images && item.post.images.length > 0 && (
                      <div className="h-48 bg-gray-800 relative">
                        <img
                          src={item.post.images[0]}
                          alt="Post"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 left-4">
                          <Badge variant="warning" className="flex items-center gap-1">
                            <BookmarkCheck className="h-3 w-3" />
                            Saved
                          </Badge>
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <RealTimeAvatar
                          userId={item.post.user.id}
                          src={item.post.user.avatar}
                          alt={item.post.user.name || "User"}
                          size="sm"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-white text-sm">
                            {item.post.user.name || "Anonymous"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatTimeAgo(item.post.createdAt)}
                          </p>
                        </div>
                      </div>

                      {item.post.title && (
                        <h3 className="font-bold text-white mb-2 line-clamp-2">
                          {item.post.title}
                        </h3>
                      )}
                      <p className="text-gray-300 text-sm mb-3 line-clamp-3">
                        {item.post.content}
                      </p>

                      {item.post.hashtags && item.post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {item.post.hashtags.slice(0, 3).map((tag, idx) => (
                            <Link
                              key={idx}
                              href={`/search?q=${tag.replace("#", "")}`}
                              className="text-purple-400 hover:text-purple-300 text-xs"
                            >
                              {tag.startsWith("#") ? tag : `#${tag}`}
                            </Link>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-700/50">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {formatNumber(item.post.likesCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {formatNumber(item.post.commentsCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {formatNumber(item.post.viewsCount)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          Saved {formatTimeAgo(item.savedAt)}
                        </span>
                      </div>

                      <Link href={`/feed?post=${item.post.id}`}>
                        <Button variant="outline" size="sm" className="w-full mt-4">
                          View Post
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


