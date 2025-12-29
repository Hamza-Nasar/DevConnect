"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, Bookmark, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

interface PostActionsProps {
    liked: boolean;
    bookmarked: boolean;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    bookmarksCount: number;
    viewsCount: number;
    onLike: () => void;
    onCommentToggle: () => void;
    onShare: () => void;
    onBookmark: () => void;
    onExplain?: () => void;
    hasCode: boolean;
    isExplaining: boolean;
}

export default function PostActions({
    liked,
    bookmarked,
    likesCount,
    commentsCount,
    sharesCount,
    bookmarksCount,
    viewsCount,
    onLike,
    onCommentToggle,
    onShare,
    onBookmark,
    onExplain,
    hasCode,
    isExplaining,
}: PostActionsProps) {
    return (
        <div className="flex flex-col gap-4 mt-6">
            <div className="flex items-center justify-between py-2 border-y border-gray-800/50">
                <div className="flex items-center gap-4 sm:gap-6">
                    <ActionButton
                        icon={Heart}
                        count={likesCount}
                        active={liked}
                        activeColor="text-red-500"
                        onClick={onLike}
                    />
                    <ActionButton
                        icon={MessageCircle}
                        count={commentsCount}
                        onClick={onCommentToggle}
                    />
                    <ActionButton
                        icon={Share2}
                        count={sharesCount}
                        onClick={onShare}
                    />
                    {/* Views - Realtime */}
                    <div className="flex items-center gap-1.5 text-gray-400">
                        <Eye className="h-5 w-5" />
                        <span className="text-sm font-medium">{formatNumber(viewsCount)}</span>
                    </div>
                </div>
                <ActionButton
                    icon={Bookmark}
                    count={bookmarksCount}
                    active={bookmarked}
                    activeColor="text-yellow-500"
                    onClick={onBookmark}
                />
            </div>

            {/* Only show Explain Code button if post has code */}
            {hasCode && onExplain && (
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onExplain}
                        disabled={isExplaining}
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-full px-4"
                    >
                        <Sparkles className={`h-4 w-4 mr-2 ${isExplaining ? "animate-pulse" : ""}`} />
                        {isExplaining ? "Analyzing..." : "Explain Code"}
                    </Button>
                </div>
            )}
        </div>
    );
}

function ActionButton({ icon: Icon, count, active, activeColor, onClick }: any) {
    return (
        <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClick}
            className={`flex items-center gap-2 transition-colors ${active ? activeColor : "text-gray-400 hover:text-white"}`}
        >
            <Icon className={`h-5 w-5 ${active ? "fill-current" : ""}`} />
            <span className="text-sm font-medium">{formatNumber(count)}</span>
        </motion.button>
    );
}
