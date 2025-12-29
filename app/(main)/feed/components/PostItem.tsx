"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import getSocket from "@/lib/socket";

// Subcomponents
import PostHeader from "./subcomponents/PostHeader";
import PostContent from "./subcomponents/PostContent";
import PostActions from "./subcomponents/PostActions";
import CommentSection from "./subcomponents/CommentSection";

interface PostItemProps {
  post: any;
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
  
  // Track if view has been counted for this session
  const viewCountedRef = useRef(false);
  
  // Intersection observer for view tracking
  const { ref: viewRef, inView } = useInView({
    threshold: 0.5,
    triggerOnce: true,
  });

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [isLiking, setIsLiking] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  const [selectedPollOption, setSelectedPollOption] = useState<string | null>(null);
  const [pollVotes, setPollVotes] = useState(post.pollOptions || []);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editTitle, setEditTitle] = useState(post.title || "");

  useEffect(() => {
    if (showComments) fetchComments();
  }, [showComments]);

  // Track view when post is visible
  useEffect(() => {
    if (inView && !viewCountedRef.current) {
      viewCountedRef.current = true;
      
      // Increment view count
      const incrementView = async () => {
        try {
          const res = await fetch(`/api/posts/${post.id}/view`, { method: "POST" });
          if (res.ok) {
            const data = await res.json();
            setViewsCount(data.viewsCount);
            
            // Emit socket event for realtime updates
            const socket = getSocket();
            if (socket) {
              socket.emit("post_view", { 
                postId: post.id, 
                viewsCount: data.viewsCount 
              });
            }
          }
        } catch (error) {
          console.error("Error tracking view:", error);
        }
      };
      
      // Small delay to avoid counting rapid scrolling
      setTimeout(incrementView, 1000);
    }
  }, [inView, post.id]);

  // Real-time socket listeners for post updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCommentAdded = (data: { postId: string; comment: any; commentsCount: number }) => {
      if (data.postId === post.id) {
        setComments((prev: any[]) => [...prev, data.comment]);
        setCommentsCount(data.commentsCount);
      }
    };

    const handleCommentDeleted = (data: { postId: string; commentId: string; commentsCount: number }) => {
      if (data.postId === post.id) {
        setComments((prev: any[]) => prev.filter(c => (c.id || c._id) !== data.commentId));
        setCommentsCount(data.commentsCount);
      }
    };

    const handleLikeUpdated = (data: { postId: string; likesCount: number; liked: boolean; userId: string }) => {
      if (data.postId === post.id) {
        setLikesCount(data.likesCount);
        // Only update local liked state if it's not our own action
        if (session?.user?.id !== data.userId) {
          // Don't change our liked state based on others' actions
        }
      }
    };

    const handlePollUpdate = (data: { pollId: string; voteCounts: number[]; totalVotes: number }) => {
      if (data.pollId === post.id) {
        setPollVotes((prev: any[]) =>
          prev.map((opt: any, idx: number) => ({
            ...opt,
            votes: data.voteCounts[idx] || opt.votes
          }))
        );
      }
    };

    // Realtime views update
    const handleViewsUpdate = (data: { postId: string; viewsCount: number }) => {
      if (data.postId === post.id) {
        setViewsCount(data.viewsCount);
      }
    };

    // Join post room
    socket.emit("join_post", post.id);

    socket.on("comment_added", handleCommentAdded);
    socket.on("comment_deleted", handleCommentDeleted);
    socket.on("like_updated", handleLikeUpdated);
    socket.on("poll_update", handlePollUpdate);
    socket.on("views_updated", handleViewsUpdate);

    return () => {
      socket.off("comment_added", handleCommentAdded);
      socket.off("comment_deleted", handleCommentDeleted);
      socket.off("like_updated", handleLikeUpdated);
      socket.off("poll_update", handlePollUpdate);
      socket.off("views_updated", handleViewsUpdate);
      socket.emit("leave_post", post.id);
    };
  }, [post.id, session?.user?.id]);

  const fetchComments = async () => {
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?postId=${post.id}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      toast.error("Failed to load comments");
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleLike = async () => {
    if (!session || isLiking) return;
    setIsLiking(true);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((prev: number) => newLiked ? prev + 1 : prev - 1);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      getSocket()?.emit("post_action", { type: "like", postId: post.id, userId: session.user.id });
    } catch (error) {
      setLiked(!newLiked);
      setLikesCount((prev: number) => !newLiked ? prev + 1 : prev - 1);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (!session) return;
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    setBookmarksCount((prev: number) => newBookmarked ? prev + 1 : prev - 1);

    try {
      const method = newBookmarked ? "POST" : "DELETE";
      const res = await fetch(`/api/posts/${post.id}/bookmark`, { method });
      if (!res.ok) throw new Error();
    } catch (error) {
      setBookmarked(!newBookmarked);
      setBookmarksCount((prev: number) => !newBookmarked ? prev + 1 : prev - 1);
      toast.error("Failed to update bookmark");
    }
  };

  const handlePostComment = async (content: string, parentId?: string) => {
    if (!content.trim() || isPostingComment) return;
    setIsPostingComment(true);
    try {
      const res = await fetch(`/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          content: content,
          parentId: parentId || null
        }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev: any[]) => [...prev, newComment]); // Add to end since we sort ascending
        setCommentInput("");
        setCommentsCount((prev: number) => prev + 1);
        toast.success("Comment posted!");
      }
    } catch (error) {
      toast.error("Failed to post comment");
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleExplainCode = async () => {
    if (!post.codeSnippet || isExplaining) return;
    setIsExplaining(true);
    try {
      const res = await fetch(`/api/ai/explain-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: post.codeSnippet.code,
          language: post.codeSnippet.language
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExplanation(data.explanation);
        toast.success("Explanation generated!");
      }
    } catch (error) {
      toast.error("Failed to explain code");
    } finally {
      setIsExplaining(false);
    }
  };

  const handleFormatCode = async () => {
    if (!post.codeSnippet) return;
    try {
      const res = await fetch(`/api/ai/format-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: post.codeSnippet.code,
          language: post.codeSnippet.language
        }),
      });
      if (res.ok) {
        const data = await res.json();
        post.codeSnippet.code = data.formattedCode; // Optimistic update on the post object
        setEditContent(post.content); // Trigger re-render if needed or just force Update
        toast.success("Code formatted!");
      }
    } catch (error) {
      toast.error("Failed to format code");
    }
  };

  const handlePollVote = async (optionIndex: number) => {
    if (selectedPollOption) return;
    const option = pollVotes[optionIndex].option;
    setSelectedPollOption(option);

    const newVotes = [...pollVotes];
    newVotes[optionIndex].votes += 1;
    setPollVotes(newVotes);

    try {
      await fetch(`/api/posts/${post.id}/poll/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex }),
      });
    } catch (error) {
      toast.error("Failed to register vote");
    }
  };

  const totalVotes = pollVotes.reduce((acc: number, curr: any) => acc + curr.votes, 0);

  return (
    <motion.div ref={viewRef} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} id={`post-${post.id}`}>
      <Card variant="elevated" className="p-4 sm:p-6 mb-6">
        <PostHeader
          post={post}
          isOwnPost={session?.user?.id === post.userId}
          onEdit={() => setIsEditing(true)}
          onDelete={onDelete}
        />

        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
            />
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="bg-gray-800 border-gray-700 min-h-[150px]"
            />
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => setIsEditing(false)}>Save</Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <PostContent
            post={post}
            selectedPollOption={selectedPollOption}
            pollVotes={pollVotes}
            totalPollVotes={totalVotes}
            handlePollVote={handlePollVote}
            explanation={explanation}
            isExplaining={isExplaining}
            onExplainCode={handleExplainCode}
            onFormatCode={handleFormatCode}
          />
        )}

        <PostActions
          liked={liked}
          bookmarked={bookmarked}
          likesCount={likesCount}
          commentsCount={commentsCount}
          sharesCount={sharesCount}
          bookmarksCount={bookmarksCount}
          viewsCount={viewsCount}
          onLike={handleLike}
          onCommentToggle={() => setShowComments(!showComments)}
          onShare={() => toast.success("Link copied to clipboard!")}
          onBookmark={handleBookmark}
          onExplain={handleExplainCode}
          hasCode={!!post.codeSnippet}
          isExplaining={isExplaining}
        />

        <AnimatePresence>
          {showComments && (
            <CommentSection
              comments={comments}
              isPostingComment={isPostingComment}
              onPostComment={handlePostComment}
              onDeleteComment={(id) => setComments((prev: any[]) => prev.filter(c => (c.id || c._id) !== id))}
              currentUserId={session?.user?.id}
            />
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
