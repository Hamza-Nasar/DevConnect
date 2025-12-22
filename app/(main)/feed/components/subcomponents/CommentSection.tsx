"use client";

import { useState, useMemo } from "react";
import { Send, Trash2, Reply, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { formatTimeAgo } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Comment {
    id: string;
    _id?: string;
    postId: string;
    userId: string;
    content: string;
    parentId: string | null;
    createdAt: string;
    user?: {
        id: string;
        name: string | null;
        avatar: string | null;
        image: string | null;
    };
}

interface CommentSectionProps {
    comments: Comment[];
    isPostingComment: boolean;
    onPostComment: (content: string, parentId?: string) => void;
    onDeleteComment: (id: string) => void;
    currentUserId?: string;
}

interface CommentItemProps {
    comment: Comment;
    allComments: Comment[];
    depth: number;
    currentUserId?: string;
    onPostComment: (content: string, parentId?: string) => void;
    onDeleteComment: (id: string) => void;
}

function CommentItem({
    comment,
    allComments,
    depth,
    currentUserId,
    onPostComment,
    onDeleteComment
}: CommentItemProps) {
    const [isReplying, setIsReplying] = useState(false);
    const [replyContent, setReplyContent] = useState("");
    const [isExpanded, setIsExpanded] = useState(true);

    const replies = useMemo(() =>
        allComments.filter(c => c.parentId === (comment.id || comment._id)),
        [allComments, comment.id, comment._id]);

    const handleSendReply = () => {
        if (!replyContent.trim()) return;
        onPostComment(replyContent.trim(), comment.id || comment._id);
        setReplyContent("");
        setIsReplying(false);
        setIsExpanded(true);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex gap-3 relative ${depth > 0 ? "mt-4" : "mt-6"}`}
        >
            {/* Visual Guide Line for nested comments */}
            {depth > 0 && depth < 5 && (
                <div
                    className="absolute left-[-20px] top-0 bottom-0 w-[2px] bg-gray-800 rounded-full"
                    style={{ left: "-1.25rem" }}
                />
            )}

            <RealTimeAvatar
                userId={comment.userId}
                src={comment.user?.image || comment.user?.avatar}
                size={depth > 0 ? "xs" : "sm"}
                className="shrink-0 z-10"
            />

            <div className="flex-1 min-w-0">
                <div className="bg-gray-800/40 rounded-2xl px-4 py-2.5 inline-block min-w-[150px] max-w-full border border-gray-700/30 group">
                    <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="font-semibold text-sm text-white truncate">
                            {comment.user?.name || "Anonymous"}
                        </span>
                        <span className="text-[10px] text-gray-500 shrink-0">
                            {formatTimeAgo(comment.createdAt)}
                        </span>
                    </div>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap break-words">
                        {comment.content}
                    </p>
                </div>

                <div className="flex items-center gap-4 mt-1.5 ml-2">
                    <button className="text-[11px] font-bold text-gray-500 hover:text-purple-400 transition uppercase tracking-wider">
                        Like
                    </button>
                    <button
                        onClick={() => setIsReplying(!isReplying)}
                        className={`text-[11px] font-bold transition uppercase tracking-wider ${isReplying ? "text-purple-400" : "text-gray-500 hover:text-purple-400"}`}
                    >
                        Reply
                    </button>

                    {replies.length > 0 && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-purple-400 transition uppercase tracking-wider"
                        >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                        </button>
                    )}

                    {currentUserId === comment.userId && (
                        <button
                            onClick={() => onDeleteComment(comment.id || comment._id || "")}
                            className="text-[11px] font-bold text-red-500/50 hover:text-red-500 transition uppercase tracking-wider"
                        >
                            Delete
                        </button>
                    )}
                </div>

                {/* Reply Input */}
                <AnimatePresence>
                    {isReplying && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 flex gap-2"
                        >
                            <input
                                autoFocus
                                type="text"
                                placeholder={`Reply to ${comment.user?.name}...`}
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleSendReply()}
                                className="flex-1 bg-gray-900/50 border border-gray-800 rounded-full px-4 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-600"
                            />
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={handleSendReply}
                                disabled={!replyContent.trim()}
                                className="rounded-full bg-purple-600 hover:bg-purple-700 h-8 w-8 p-0"
                            >
                                <Send className="h-3 w-3" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Recursive Replies */}
                <AnimatePresence>
                    {isExpanded && replies.length > 0 && (
                        <div className="ml-4 pl-2 border-l-0 border-gray-800">
                            {replies.map((reply) => (
                                <CommentItem
                                    key={reply.id || reply._id}
                                    comment={reply}
                                    allComments={allComments}
                                    depth={depth + 1}
                                    currentUserId={currentUserId}
                                    onPostComment={onPostComment}
                                    onDeleteComment={onDeleteComment}
                                />
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

export default function CommentSection({
    comments,
    isPostingComment,
    onPostComment,
    onDeleteComment,
    currentUserId,
}: CommentSectionProps) {
    const [mainInput, setMainInput] = useState("");

    const topLevelComments = useMemo(() =>
        comments.filter(c => !c.parentId),
        [comments]);

    const handleMainPost = () => {
        if (!mainInput.trim()) return;
        onPostComment(mainInput.trim());
        setMainInput("");
    };

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-gray-800"
        >
            {/* Main Comment Input */}
            <div className="flex gap-3 mb-8">
                <RealTimeAvatar size="sm" />
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        placeholder="Write a comment..."
                        value={mainInput}
                        onChange={(e) => setMainInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleMainPost()}
                        className="flex-1 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500 shadow-inner"
                    />
                    <Button
                        variant="primary"
                        size="icon"
                        onClick={handleMainPost}
                        disabled={!mainInput.trim() || isPostingComment}
                        className="rounded-full bg-purple-600 hover:bg-purple-700 h-10 w-10 shadow-lg shadow-purple-500/20"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                {topLevelComments.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 flex flex-col items-center gap-2">
                        <MessageSquare className="h-8 w-8 opacity-20" />
                        <p className="text-sm">No comments yet. Be the first to start the conversation!</p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {topLevelComments.map((comment) => (
                            <CommentItem
                                key={comment.id || comment._id}
                                comment={comment}
                                allComments={comments}
                                depth={0}
                                currentUserId={currentUserId}
                                onPostComment={onPostComment}
                                onDeleteComment={onDeleteComment}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </motion.div>
    );
}
