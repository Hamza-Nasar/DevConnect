"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  MoreVertical,
  Flag,
  Bookmark,
  Eye,
  Download,
  Copy,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Send,
  X,
  Edit,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";
import getSocket from "@/lib/socket";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { formatTimeAgo, formatNumber } from "@/lib/utils";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

interface Post {
  id: string;
  title?: string;
  content: string;
  images?: string[];
  video?: string;
  hashtags?: string[];
  location?: string;
  linkPreview?: {
    url: string;
    title: string;
    description?: string;
    image?: string;
  };
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
  bookmarksCount?: number;
  likedByUser?: boolean;
  sharedByUser?: boolean;
  bookmarkedByUser?: boolean;
  createdAt: string;
  type?: "text" | "poll" | "story" | "reel";
  pollOptions?: Array<{ option: string; votes: number }>;
  pollDuration?: number;
}

interface PostItemProps {
  post: Post;
  onDelete: (id: string) => void;
}

export default function PostItem({ post, onDelete }: PostItemProps) {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(post.likedByUser || false);
  const [bookmarked, setBookmarked] = useState(post.bookmarkedByUser || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [bookmarksCount, setBookmarksCount] = useState(post.bookmarksCount || 0);
  const [viewsCount, setViewsCount] = useState(post.viewsCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [selectedPollOption, setSelectedPollOption] = useState<string | null>(null);
  const [pollVotes, setPollVotes] = useState(post.pollOptions || []);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [isSaving, setIsSaving] = useState(false);

  const isOwnPost = session?.user?.id === post.userId;


  // Fetch comments when comments section is opened
  useEffect(() => {
    if (showComments && comments.length === 0) {
      fetchComments();
    }
  }, [showComments]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit("join_post", post.id);

    // Real-time like updates
    socket.on("like_updated", (data: { postId: string; liked: boolean; userId: string; likesCount: number }) => {
      if (data.postId === post.id) {
        setLikesCount(data.likesCount);
        if (data.userId === session?.user?.id) {
          setLiked(data.liked);
        }
      }
    });

    // Real-time share updates
    socket.on("share_updated", (data: { postId: string; sharesCount: number }) => {
      if (data.postId === post.id) {
        setSharesCount(data.sharesCount);
      }
    });

    // Real-time bookmark updates
    socket.on("bookmark_updated", (data: { postId: string; bookmarked: boolean; userId: string; bookmarksCount: number }) => {
      if (data.postId === post.id) {
        setBookmarksCount(data.bookmarksCount);
        if (data.userId === session?.user?.id) {
          setBookmarked(data.bookmarked);
        }
      }
    });

    // Real-time comment updates
    socket.on("comment_added", (data: { postId: string; commentsCount: number; comment?: any }) => {
      if (data.postId === post.id) {
        setCommentsCount(data.commentsCount);
        if (data.comment && showComments) {
          setComments((prev) => {
            // Prevent duplicates - check if comment already exists
            const commentId = data.comment.id || data.comment._id;
            if (commentId && prev.some((c) => (c.id || c._id) === commentId)) {
              return prev; // Comment already exists, don't add duplicate
            }
            return [data.comment, ...prev];
          });
        }
      }
    });

    socket.on("comment_deleted", (data: { postId: string; commentId: string; commentsCount: number }) => {
      if (data.postId === post.id) {
        setCommentsCount(data.commentsCount);
        setComments((prev) => prev.filter((c) => c.id !== data.commentId));
      }
    });

    // Real-time view updates
    socket.on("view_updated", (data: { postId: string; viewsCount: number }) => {
      if (data.postId === post.id) {
        setViewsCount(data.viewsCount);
      }
    });

    // Real-time poll updates
    socket.on("poll_voted", (data: { postId: string; option: string; votes: number[] }) => {
      if (data.postId === post.id) {
        setPollVotes(data.votes.map((v, i) => ({ option: post.pollOptions?.[i]?.option || "", votes: v })));
      }
    });

    return () => {
      socket.emit("leave_post", post.id);
      socket.off("like_updated");
      socket.off("share_updated");
      socket.off("bookmark_updated");
      socket.off("comment_added");
      socket.off("view_updated");
      socket.off("poll_voted");
      socket.off("comment_deleted");
    };
  }, [post.id, post.pollOptions, session?.user?.id, showComments]);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const socket = getSocket();
    const newLiked = !liked;

    // Optimistic update
    setLiked(newLiked);
    setLikesCount((prev) => (newLiked ? prev + 1 : prev - 1));

    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update state with server response
        setLiked(data.liked);
        // Emit real-time event
        if (socket) {
          socket.emit("like_post", {
            postId: post.id,
            userId: session?.user?.id,
            liked: data.liked,
          });
        }
        toast.success(data.liked ? "Liked!" : "Unliked");
      } else {
        // Revert on error
        setLiked(!newLiked);
        setLikesCount((prev) => (newLiked ? prev - 1 : prev + 1));
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to like post");
      }
    } catch (error) {
      console.error("Error liking post:", error);
      // Revert on error
      setLiked(!newLiked);
      setLikesCount((prev) => (newLiked ? prev - 1 : prev + 1));
      toast.error("Failed to like post");
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    const socket = getSocket();

    // Optimistic update
    setSharesCount((prev) => prev + 1);

    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });

      if (res.ok) {
        // Emit real-time event
        if (socket) {
          socket.emit("share_post", {
            postId: post.id,
            userId: session?.user?.id,
          });
        }
        toast.success("Post shared!");
      } else {
        // Revert on error
        setSharesCount((prev) => prev - 1);
        toast.error("Failed to share post");
      }
    } catch (error) {
      console.error("Error sharing post:", error);
      // Revert on error
      setSharesCount((prev) => prev - 1);
      toast.error("Failed to share post");
    } finally {
      setIsSharing(false);
    }
  };

  const handleBookmark = async () => {
    const socket = getSocket();
    const newBookmarked = !bookmarked;

    // Optimistic update
    setBookmarked(newBookmarked);
    setBookmarksCount((prev) => (newBookmarked ? prev + 1 : prev - 1));

    try {
      const method = bookmarked ? "DELETE" : "POST";
      const res = await fetch("/api/bookmarks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update state with server response
        setBookmarked(data.bookmarked !== undefined ? data.bookmarked : newBookmarked);
        // Emit real-time event
        if (socket) {
          socket.emit("bookmark_post", {
            postId: post.id,
            userId: session?.user?.id,
            bookmarked: data.bookmarked !== undefined ? data.bookmarked : newBookmarked,
          });
        }
        toast.success((data.bookmarked !== undefined ? data.bookmarked : newBookmarked) ? "Saved to bookmarks" : "Removed from bookmarks");
      } else {
        // Revert on error
        setBookmarked(!newBookmarked);
        setBookmarksCount((prev) => (newBookmarked ? prev - 1 : prev + 1));
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to bookmark post");
      }
    } catch (error) {
      console.error("Error bookmarking post:", error);
      // Revert on error
      setBookmarked(!newBookmarked);
      setBookmarksCount((prev) => (newBookmarked ? prev - 1 : prev + 1));
      toast.error("Failed to bookmark post");
    }
  };

  const handlePollVote = async (optionIndex: number) => {
    if (selectedPollOption !== null) {
      toast("You've already voted on this poll");
      return;
    }

    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, optionIndex }),
      });

      if (res.ok) {
        setSelectedPollOption(post.pollOptions?.[optionIndex]?.option || null);
        toast.success("Vote recorded!");
      }
    } catch (error) {
      console.error("Error voting on poll:", error);
      toast.error("Failed to vote");
    }
  };

  const fetchComments = async () => {
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?postId=${post.id}`);
      if (res.ok) {
        const data = await res.json();
        // Remove duplicates based on id or _id
        const uniqueComments = (data || []).filter((comment: any, index: number, self: any[]) => {
          const commentId = comment.id || comment._id;
          if (!commentId) return true; // Keep comments without id (will use index as key)
          return index === self.findIndex((c: any) => (c.id || c._id) === commentId);
        });
        setComments(uniqueComments);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentInput.trim() || isPostingComment) return;

    setIsPostingComment(true);
    const socket = getSocket();
    const tempId = Date.now().toString();
    const tempComment = {
      id: tempId,
      content: commentInput,
      createdAt: new Date().toISOString(),
      user: {
        id: session?.user?.id,
        name: session?.user?.name,
        image: session?.user?.image,
        avatar: session?.user?.image,
      },
      userId: session?.user?.id,
    };

    // Optimistic update - ensure no duplicates
    setComments((prev) => {
      // Check if temp comment already exists (shouldn't happen, but safety check)
      const exists = prev.some((c) => c.id === tempId);
      if (exists) return prev;
      return [tempComment, ...prev];
    });
    setCommentInput("");
    setCommentsCount((prev) => prev + 1);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, content: commentInput }),
      });

      if (res.ok) {
        const data = await res.json();
        // Replace temp comment with real one
        setComments((prev) => prev.map((c) => (c.id === tempId ? data : c)));

        // Emit real-time event
        if (socket) {
          socket.emit("new_comment", {
            postId: post.id,
            commentId: data.id,
            userId: session?.user?.id,
          });
        }
        toast.success("Comment posted!");
      } else {
        // Revert on error
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setCommentsCount((prev) => prev - 1);
        toast.error("Failed to post comment");
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      // Revert on error
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setCommentsCount((prev) => prev - 1);
      toast.error("Failed to post comment");
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleEditPost = async () => {
    if (!editContent.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: editContent.trim(),
          title: editTitle.trim() || undefined,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        toast.success("Post updated!");
        // Optionally refresh the post data
        window.location.reload();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to update post");
      }
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Failed to update post");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setCommentsCount((prev) => Math.max(0, prev - 1));

        const socket = getSocket();
        if (socket) {
          socket.emit("delete_comment", {
            postId: post.id,
            commentId,
          });
        }
        toast.success("Comment deleted");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const copyLink = () => {
    if (typeof window === "undefined" || !navigator.clipboard) return;
    const url = `${window.location.origin}/feed?post=${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard!");
      setShowShareMenu(false);
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const shareToSocial = (platform: string) => {
    if (typeof window === "undefined") return;
    const url = encodeURIComponent(`${window.location.origin}/feed?post=${post.id}`);
    const text = encodeURIComponent(post.content);
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };
    window.open(shareUrls[platform], "_blank");
    setShowShareMenu(false);
  };

  const totalPollVotes = pollVotes.reduce((sum, opt) => sum + opt.votes, 0);

  return (
    <motion.div
      data-post-id={post.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card variant="elevated" hover={false} className="mb-6">
        {/* Post Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.user?.username ||
              (post.user?.name ? post.user.name.toLowerCase().replace(/\s+/g, '') : 'user')
              }`}>
              <RealTimeAvatar
                userId={post.userId || post.user?.id}
                src={post.user?.image || post.user?.avatar}
                alt={post.user?.name || "User"}
                size="md"
                status="offline"
              />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${post.user?.username ||
                    (post.user?.name ? post.user.name.toLowerCase().replace(/\s+/g, '') : 'user')
                    }`}
                  className="font-semibold text-white hover:text-purple-400 transition"
                >
                  {post.user?.name || "Anonymous"}
                </Link>
                {post.user?.verified && (
                  <Badge variant="success" className="text-xs">Verified</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>{formatTimeAgo(post.createdAt)}</span>
                {post.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span>{post.location}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
            {showMoreMenu && (
              <div className="absolute right-0 top-10 w-48 bg-popover rounded-lg shadow-xl border border-border z-10">
                {isOwnPost ? (
                  <>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setIsEditing(true);
                        setEditContent(post.content);
                        setEditTitle(post.title || "");
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-foreground text-sm"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        onDelete(post.id);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-destructive/10 text-destructive text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        setShowMoreMenu(false);
                        const reason = prompt("Why are you reporting this post?");
                        if (reason) {
                          try {
                            const res = await fetch("/api/reports", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                postId: post.id,
                                reason: reason,
                              }),
                            });
                            if (res.ok) {
                              toast.success("Post reported. Thank you for your feedback!");
                            } else {
                              toast.error("Failed to report post");
                            }
                          } catch (error) {
                            console.error("Error reporting post:", error);
                            toast.error("Failed to report post");
                          }
                        }
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-destructive/10 text-destructive text-sm"
                    >
                      <Flag className="h-4 w-4" />
                      Report
                    </button>
                    <button
                      onClick={async () => {
                        setShowMoreMenu(false);
                        try {
                          // Store hidden post ID in localStorage
                          const hiddenPosts = JSON.parse(localStorage.getItem("hiddenPosts") || "[]");
                          if (!hiddenPosts.includes(post.id)) {
                            hiddenPosts.push(post.id);
                            localStorage.setItem("hiddenPosts", JSON.stringify(hiddenPosts));
                            toast.success("Post hidden");
                            // Hide the post immediately
                            const postElement = document.querySelector(`[data-post-id="${post.id}"]`);
                            if (postElement) {
                              (postElement as HTMLElement).style.display = "none";
                            }
                          }
                        } catch (error) {
                          console.error("Error hiding post:", error);
                          toast.error("Failed to hide post");
                        }
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-foreground text-sm"
                    >
                      <X className="h-4 w-4" />
                      Hide
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Edit Mode */}
        {isEditing ? (
          <div className="mb-4 space-y-3">
            {post.title !== undefined && (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Post title (optional)"
                className="bg-secondary/50 border-input"
              />
            )}
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-4 py-3 bg-secondary/50 border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[120px]"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleEditPost}
                disabled={!editContent.trim() || isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(post.content);
                  setEditTitle(post.title || "");
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Post Title */}
            {post.title && (
              <h3 className="text-xl font-bold text-foreground mb-2">{post.title}</h3>
            )}

            {/* Post Content */}
            <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{post.content}</p>
          </>
        )}

        {/* Link Preview */}
        {post.linkPreview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 border border-border rounded-lg overflow-hidden bg-muted/30"
          >
            {post.linkPreview.image && (
              <img
                src={post.linkPreview.image}
                alt={post.linkPreview.title}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-4">
              <h4 className="font-semibold text-foreground mb-1">{post.linkPreview.title}</h4>
              {post.linkPreview.description && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{post.linkPreview.description}</p>
              )}
              <a
                href={post.linkPreview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-primary/80"
              >
                {post.linkPreview.url}
              </a>
            </div>
          </motion.div>
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.hashtags.map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${tag}`}
                className="text-primary hover:text-primary/80 text-sm"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Poll */}
        {post.type === "poll" && post.pollOptions && (
          <div className="mb-4 p-4 bg-muted/30 rounded-xl border border-border">
            <div className="space-y-2">
              {post.pollOptions.map((option, index) => {
                const voteCount = pollVotes[index]?.votes || 0;
                const percentage = totalPollVotes > 0 ? (voteCount / totalPollVotes) * 100 : 0;
                const isSelected = selectedPollOption === option.option;

                return (
                  <button
                    key={index}
                    onClick={() => handlePollVote(index)}
                    disabled={selectedPollOption !== null}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${isSelected
                      ? "border-primary bg-primary/20"
                      : "border-border hover:border-input bg-secondary/50"
                      } ${selectedPollOption !== null ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-foreground font-medium">{option.option}</span>
                      {selectedPollOption !== null && (
                        <span className="text-sm text-muted-foreground">
                          {voteCount} votes ({percentage.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                    {selectedPollOption !== null && (
                      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {post.pollDuration && (
              <p className="text-xs text-gray-400 mt-2">
                Poll ends in {post.pollDuration} days
              </p>
            )}
          </div>
        )}

        {/* Images/Media */}
        {post.images && post.images.length > 0 && (
          <div className={`mb-4 grid gap-2 ${post.images.length === 1 ? "grid-cols-1" :
            post.images.length === 2 ? "grid-cols-2" :
              "grid-cols-2"
            }`}>
            {post.images.map((img, index) => (
              <div key={index} className="relative group rounded-lg overflow-hidden">
                <img
                  src={img}
                  alt={`Post image ${index + 1}`}
                  className="w-full h-auto object-cover cursor-pointer"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.open(img, "_blank");
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button variant="ghost" size="icon" onClick={() => {
                    if (typeof window !== "undefined") {
                      window.open(img, "_blank");
                    }
                  }}>
                    <ExternalLink className="h-5 w-5 text-white" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video */}
        {post.video && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <video
              src={post.video}
              controls
              className="w-full max-h-96 object-contain"
            />
          </div>
        )}

        {/* Post Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-6">
            {/* Like */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={isLiking}
                className={liked ? "text-destructive hover:text-destructive/80" : "text-muted-foreground hover:text-destructive"}
              >
                <motion.div
                  animate={liked ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
                </motion.div>
                <span className="ml-1">{formatNumber(likesCount)}</span>
              </Button>
            </motion.div>

            {/* Comment */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="text-muted-foreground hover:text-blue-500"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="ml-1">{formatNumber(commentsCount)}</span>
            </Button>

            {/* Share */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="text-muted-foreground hover:text-green-500"
              >
                <Share2 className="h-5 w-5" />
                <span className="ml-1">{formatNumber(sharesCount)}</span>
              </Button>
              {showShareMenu && (
                <div className="absolute left-0 bottom-full mb-2 w-48 bg-popover rounded-lg shadow-xl border border-border z-10">
                  <button
                    onClick={copyLink}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-foreground text-sm"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </button>
                  <button
                    onClick={() => shareToSocial("twitter")}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-foreground text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Share on Twitter
                  </button>
                  <button
                    onClick={() => shareToSocial("facebook")}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-foreground text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Share on Facebook
                  </button>
                </div>
              )}
            </div>

            {/* Bookmark */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmark}
              className={bookmarked ? "text-yellow-500 hover:text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}
            >
              <Bookmark className={`h-5 w-5 ${bookmarked ? "fill-current" : ""}`} />
              <span className="ml-1">{formatNumber(bookmarksCount)}</span>
            </Button>
          </div>

          {/* Views */}
          {viewsCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{formatNumber(viewsCount)}</span>
            </div>
          )}
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-border">
            {/* Comment Input */}
            <div className="flex gap-2 mb-4">
              <RealTimeAvatar
                userId={session?.user?.id}
                src={session?.user?.image}
                alt={session?.user?.name || "You"}
                size="sm"
              />
              <div className="flex-1 flex gap-2">
                <Input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handlePostComment();
                    }
                  }}
                  className="flex-1 bg-secondary/50 border-input"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePostComment}
                  disabled={!commentInput.trim() || isPostingComment}
                >
                  {isPostingComment ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Comments List */}
            {isLoadingComments ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first to comment!</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {comments.map((comment, index) => {
                  // Generate unique key - always include index to ensure uniqueness
                  const commentId = comment.id || comment._id;
                  const uniqueKey = commentId 
                    ? `${commentId}-${index}-${post.id}` 
                    : `comment-${post.id}-${index}-${comment.createdAt || Date.now()}`;
                  
                  return (
                    <motion.div
                      key={uniqueKey}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2"
                    >
                    <RealTimeAvatar
                      userId={comment.userId}
                      src={comment.user?.image || comment.user?.avatar}
                      alt={comment.user?.name || "User"}
                      size="sm"
                    />
                    <div className="flex-1">
                      <div className="bg-secondary/50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground text-sm">
                            {comment.user?.name || "Anonymous"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
                      </div>
                      {comment.userId === session?.user?.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-destructive hover:text-destructive/80 mt-1 ml-1"
                        >
                          Delete
                        </button>
                      )}
                    </div>     
                  </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
