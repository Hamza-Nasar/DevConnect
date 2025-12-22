"use client";

import Link from "next/link";
import { MoreVertical, Edit, Trash2, Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { formatTimeAgo } from "@/lib/utils";
import { useState } from "react";
import toast from "react-hot-toast";

interface PostHeaderProps {
    post: any;
    isOwnPost: boolean;
    onEdit: () => void;
    onDelete: (id: string) => void;
}

export default function PostHeader({ post, isOwnPost, onEdit, onDelete }: PostHeaderProps) {
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const handleReport = async () => {
        setShowMoreMenu(false);
        const reason = prompt("Why are you reporting this post?");
        if (reason) {
            try {
                const res = await fetch("/api/reports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ postId: post.id, reason }),
                });
                if (res.ok) toast.success("Post reported. Thank you!");
                else toast.error("Failed to report post");
            } catch (error) {
                toast.error("Failed to report post");
            }
        }
    };

    const handleHide = () => {
        setShowMoreMenu(false);
        try {
            const hiddenPosts = JSON.parse(localStorage.getItem("hiddenPosts") || "[]");
            if (!hiddenPosts.includes(post.id)) {
                hiddenPosts.push(post.id);
                localStorage.setItem("hiddenPosts", JSON.stringify(hiddenPosts));
                toast.success("Post hidden");
                const postElement = document.getElementById(`post-${post.id}`);
                if (postElement) postElement.style.display = "none";
            }
        } catch (error) {
            toast.error("Failed to hide post");
        }
    };

    return (
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <Link href={`/profile/${post.user?.username || (post.user?.name ? post.user.name.toLowerCase().replace(/\s+/g, '') : 'user')}`}>
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
                            href={`/profile/${post.user?.username || (post.user?.name ? post.user.name.toLowerCase().replace(/\s+/g, '') : 'user')}`}
                            className="font-semibold text-white hover:text-purple-400 transition"
                        >
                            {post.user?.name || "Anonymous"}
                        </Link>
                        {post.user?.verified && <Badge variant="success" className="text-xs">Verified</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{formatTimeAgo(post.createdAt)}</span>
                        {post.location && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1">{post.location}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative">
                <Button variant="ghost" size="icon" onClick={() => setShowMoreMenu(!showMoreMenu)}>
                    <MoreVertical className="h-5 w-5" />
                </Button>
                {showMoreMenu && (
                    <div className="absolute right-0 top-10 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        {isOwnPost ? (
                            <>
                                <button onClick={() => { setShowMoreMenu(false); onEdit(); }} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-white text-sm transition">
                                    <Edit className="h-4 w-4 text-blue-400" /> Edit
                                </button>
                                <button onClick={() => { setShowMoreMenu(false); onDelete(post.id); }} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 text-red-500 text-sm transition font-medium border-t border-gray-800">
                                    <Trash2 className="h-4 w-4" /> Delete
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={handleReport} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 text-red-500 text-sm transition">
                                    <Flag className="h-4 w-4" /> Report
                                </button>
                                <button onClick={handleHide} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-white text-sm transition border-t border-gray-800">
                                    <X className="h-4 w-4 text-gray-400" /> Hide
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
