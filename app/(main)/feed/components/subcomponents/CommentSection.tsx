"use client";

import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { formatTimeAgo } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CommentSectionProps {
    comments: any[];
    commentInput: string;
    setCommentInput: (val: string) => void;
    isPostingComment: boolean;
    onPostComment: () => void;
    onDeleteComment: (id: string) => void;
    currentUserId?: string;
}

export default function CommentSection({
    comments,
    commentInput,
    setCommentInput,
    isPostingComment,
    onPostComment,
    onDeleteComment,
    currentUserId,
}: CommentSectionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-gray-800"
        >
            <div className="flex gap-3 mb-6">
                <RealTimeAvatar size="sm" />
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && onPostComment()}
                        className="flex-1 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
                    />
                    <Button
                        variant="primary"
                        size="icon"
                        onClick={onPostComment}
                        disabled={!commentInput.trim() || isPostingComment}
                        className="rounded-full bg-purple-600 hover:bg-purple-700 h-9 w-9"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                <AnimatePresence initial={false}>
                    {comments.map((comment) => (
                        <motion.div
                            key={comment.id || comment._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex gap-3 group"
                        >
                            <RealTimeAvatar
                                userId={comment.userId}
                                src={comment.user?.image || comment.user?.avatar}
                                size="sm"
                            />
                            <div className="flex-1">
                                <div className="bg-gray-800/40 rounded-2xl px-4 py-2.5 inline-block min-w-[150px] border border-gray-700/30">
                                    <div className="flex items-center justify-between gap-4 mb-1">
                                        <span className="font-semibold text-sm text-white">{comment.user?.name || "Anonymous"}</span>
                                        <span className="text-[10px] text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
                                    </div>
                                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{comment.content}</p>
                                </div>
                                <div className="flex items-center gap-4 mt-1.5 ml-2 px-1">
                                    <button className="text-[11px] font-bold text-gray-500 hover:text-purple-400 transition uppercase tracking-wider">Like</button>
                                    <button className="text-[11px] font-bold text-gray-500 hover:text-purple-400 transition uppercase tracking-wider">Reply</button>
                                    {currentUserId === comment.userId && (
                                        <button
                                            onClick={() => onDeleteComment(comment.id || comment._id)}
                                            className="text-[11px] font-bold text-red-500/50 hover:text-red-500 transition uppercase tracking-wider opacity-0 group-hover:opacity-100"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
