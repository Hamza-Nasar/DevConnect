"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
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

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [isLiking, setIsLiking] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [postSummary, setPostSummary] = useState<string | null>(post.summary || null);
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

  const fetchComments = async () => {
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`);
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
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
      getSocket()?.emit("post_action", { type: "like", postId: post.id, userId: session.user.id });
    } catch (error) {
      setLiked(!newLiked);
      setLikesCount(prev => !newLiked ? prev + 1 : prev - 1);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (!session) return;
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    setBookmarksCount(prev => newBookmarked ? prev + 1 : prev - 1);

    try {
      const res = await fetch(`/api/posts/${post.id}/bookmark`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch (error) {
      setBookmarked(!newBookmarked);
      setBookmarksCount(prev => !newBookmarked ? prev + 1 : prev - 1);
      toast.error("Failed to update bookmark");
    }
  };

  const handleSummarize = async () => {
    if (postSummary) { setPostSummary(null); return; }
    setIsSummarizing(true);
    try {
      const res = await fetch(`/api/ai/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: post.content }),
      });
      if (res.ok) {
        const data = await res.json();
        setPostSummary(data.summary);
      }
    } catch (error) {
      toast.error("AI Summarization failed");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentInput.trim() || isPostingComment) return;
    setIsPostingComment(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentInput }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [newComment, ...prev]);
        setCommentInput("");
        setCommentsCount(prev => prev + 1);
        toast.success("Comment posted!");
      }
    } catch (error) {
      toast.error("Failed to post comment");
    } finally {
      setIsPostingComment(false);
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} id={`post-${post.id}`}>
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
            postSummary={postSummary}
            selectedPollOption={selectedPollOption}
            pollVotes={pollVotes}
            totalPollVotes={totalVotes}
            handlePollVote={handlePollVote}
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
          onSummarize={handleSummarize}
          hasCode={!!post.codeSnippet}
          isSummarizing={isSummarizing}
          isExplaining={isExplaining}
        />

        <AnimatePresence>
          {showComments && (
            <CommentSection
              comments={comments}
              commentInput={commentInput}
              setCommentInput={setCommentInput}
              isPostingComment={isPostingComment}
              onPostComment={handlePostComment}
              onDeleteComment={(id) => setComments(prev => prev.filter(c => c.id !== id))}
              currentUserId={session?.user?.id}
            />
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
