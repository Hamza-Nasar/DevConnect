"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import PostItem from "./PostItem";
import { InfiniteScroll } from "@/components/infinite-scroll/InfiniteScroll";
import getSocket from "@/lib/socket";
import toast from "react-hot-toast";

interface Post {
  id: string;
  title?: string;
  content: string;
  images?: string[];
  video?: string;
  hashtags?: string[];
  location?: string;
  userId?: string;
  user?: {
    id: string;
    name?: string;
    username?: string;
    avatar?: string;
    image?: string;
    verified?: boolean;
  };
  commentsCount?: number;
  likesCount?: number;
  sharesCount?: number;
  viewsCount?: number;
  likedByUser?: boolean;
  sharedByUser?: boolean;
  createdAt: string;
}

interface PostListProps {
  onDelete: (id: string) => void;
  filter?: string;
}

export default function PostList({ onDelete, filter = "All" }: PostListProps) {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const hasMountedRef = useRef(false);

  const fetchPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/posts?page=${pageNum}&limit=10&filter=${filter}`);
      if (!res.ok) throw new Error("Failed to fetch posts");

      const data = await res.json();
      const newPosts = data.posts || [];

      if (append) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setHasMore(newPosts.length === 10);
      setPage(pageNum);
    } catch (err: any) {
      console.error("Error fetching posts:", err);
      setError(err.message || "Failed to load posts");
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [filter]);

  useEffect(() => {
    fetchPosts(1, false);
  }, [filter, fetchPosts]);

  // Socket event handlers - separate effect to avoid re-running fetchPosts
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Join user room for real-time updates
    if (session?.user?.id) {
      socket.emit("join", session.user.id);
    }

    const handleNewPost = (data: any) => {
      // Add new post to the list immediately (real-time)
      if (data && data.id) {
        // Check if post already exists to avoid duplicates
        setPosts((prev) => {
          const exists = prev.some((p) => p.id === data.id);
          if (exists) return prev;
          return [data, ...prev];
        });
        toast.success("✨ New post in your feed!");
      } else if (!isLoadingRef.current) {
        // Fallback: refresh if post data not provided
        fetchPosts(1, false);
      }
    };

    const handlePostCreated = (data: any) => {
      // Handle post created event (for the user who created it)
      if (data && data.id) {
        setPosts((prev) => {
          const exists = prev.some((p) => p.id === data.id);
          if (exists) return prev;
          return [data, ...prev];
        });
      }
    };

    const handlePostDeleted = (data: { postId: string }) => {
      setPosts((prev) => prev.filter((p) => p.id !== data.postId));
      toast.success("Post deleted");
    };

    const handlePostUpdated = (data: { post: Post }) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === data.post.id ? data.post : p))
      );
    };

    const handleAvatarChanged = (data: { userId: string; avatar: string }) => {
      // Update avatar in all posts for this user
      setPosts((prev) =>
        prev.map((p) =>
          p.user?.id === data.userId
            ? {
              ...p,
              user: {
                ...p.user,
                avatar: data.avatar,
                image: data.avatar,
              },
            }
            : p
        )
      );
    };

    socket.on("new_post", handleNewPost);
    socket.on("post_created", handlePostCreated);
    socket.on("post_deleted", handlePostDeleted);
    socket.on("post_updated", handlePostUpdated);
    socket.on("avatar_changed", handleAvatarChanged);

    return () => {
      socket.off("new_post", handleNewPost);
      socket.off("post_created", handlePostCreated);
      socket.off("post_deleted", handlePostDeleted);
      socket.off("post_updated", handlePostUpdated);
      socket.off("avatar_changed", handleAvatarChanged);
    };
  }, [session?.user?.id]); // Include session.user.id to re-join when user changes

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchPosts(page + 1, true);
  }, [hasMore, isLoading, page, fetchPosts]);

  if (error && posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => fetchPosts(1, false)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">No posts yet</p>
        <p className="text-gray-500 text-sm mt-2">Be the first to share something!</p>
      </div>
    );
  }

  return (
    <InfiniteScroll
      loadMore={loadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      endMessage={<p className="text-gray-400">No more posts to load</p>}
    >
      <div className="space-y-6">
        {posts.map((post) => (
          <PostItem key={post.id} post={post} onDelete={onDelete} />
        ))}
      </div>
    </InfiniteScroll>
  );
}
