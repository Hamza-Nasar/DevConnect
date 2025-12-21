"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Heart, MessageCircle, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import getSocket from "@/lib/socket";
import { useOptimisticUpdate } from "@/lib/optimistic";

interface Post {
    id: string;
    title?: string;
    content: string;
    images?: string[];
    userId?: string;
    user?: { id: string; name?: string; avatar?: string; image?: string };
    likesCount?: number;
    commentsCount?: number;
    sharesCount?: number;
    likedByUser?: boolean;
    createdAt: string;
}

interface OptimisticPostItemProps {
    post: Post;
    onDelete: (id: string) => void;
    onLike: (id: string) => Promise<void>;
    onShare: (id: string) => Promise<void>;
}

export default function OptimisticPostItem({
    post,
    onDelete,
    onLike,
    onShare,
}: OptimisticPostItemProps) {
    const { data: session } = useSession();
    const [liked, setLiked] = useState(post.likedByUser || false);
    const [likesCount, setLikesCount] = useState(post.likesCount || 0);
    const [sharesCount, setSharesCount] = useState(post.sharesCount || 0);
    const [isLiking, setIsLiking] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const { applyOptimistic, confirmUpdate, rollbackUpdate } = useOptimisticUpdate(
        [post],
        () => {}
    );

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        socket.emit("join_post", post.id);

        socket.on("like_updated", (data: { postId: string; liked: boolean; userId: string }) => {
            if (data.postId === post.id) {
                setLikesCount((prev) => (data.liked ? prev + 1 : prev - 1));
                if (data.userId === session?.user?.id) {
                    setLiked(data.liked);
                }
            }
        });

        socket.on("share_updated", () => {
            setSharesCount((prev) => prev + 1);
        });

        return () => {
            socket.emit("leave_post", post.id);
            socket.off("like_updated");
            socket.off("share_updated");
        };
    }, [post.id, session?.user?.id]);

    const handleLike = async () => {
        if (isLiking) return;
        setIsLiking(true);

        const newLiked = !liked;
        const tempId = `like-${Date.now()}`;

        // Optimistic update
        const optimisticData = {
            ...post,
            likesCount: newLiked ? likesCount + 1 : likesCount - 1,
            likedByUser: newLiked,
        };
        applyOptimistic(optimisticData, tempId);

        setLiked(newLiked);
        setLikesCount((prev) => (newLiked ? prev + 1 : prev - 1));

        try {
            await onLike(post.id);
            confirmUpdate(tempId, post.id, optimisticData);
        } catch (error) {
            console.error("Error liking post:", error);
            rollbackUpdate(tempId);
            setLiked(!newLiked);
            setLikesCount((prev) => (newLiked ? prev - 1 : prev + 1));
        } finally {
            setIsLiking(false);
        }
    };

    const handleShare = async () => {
        if (isSharing) return;
        setIsSharing(true);

        const tempId = `share-${Date.now()}`;
        const optimisticData = {
            ...post,
            sharesCount: sharesCount + 1,
        };
        applyOptimistic(optimisticData, tempId);
        setSharesCount((prev) => prev + 1);

        try {
            await onShare(post.id);
            confirmUpdate(tempId, post.id, optimisticData);
        } catch (error) {
            console.error("Error sharing post:", error);
            rollbackUpdate(tempId);
            setSharesCount((prev) => prev - 1);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <article className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-lg">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                    {post.user?.avatar || post.user?.image ? (
                        <img
                            src={post.user.avatar || post.user.image || ""}
                            alt={post.user.name || "User"}
                            className="w-12 h-12 rounded-full"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {(post.user?.name || "U")[0].toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h3 className="font-semibold text-white">{post.user?.name || "Unknown"}</h3>
                        <p className="text-sm text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                {session?.user?.id === post.userId && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(post.id)}
                        className="text-red-400 hover:text-red-600"
                    >
                        <Trash2 className="w-5 h-5" />
                    </Button>
                )}
            </div>

            {post.title && <h2 className="text-xl font-bold text-white mb-2">{post.title}</h2>}
            <p className="text-gray-300 mb-4">{post.content}</p>

            {post.images && post.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {post.images.map((img, idx) => (
                        <img
                            key={idx}
                            src={img}
                            alt={`Post ${idx + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                        />
                    ))}
                </div>
            )}

            <div className="flex items-center justify-around pt-4 border-t border-gray-700">
                <Button
                    variant="ghost"
                    onClick={handleLike}
                    disabled={isLiking}
                    className={`flex items-center space-x-2 ${
                        liked
                            ? "text-red-500 hover:text-red-600"
                            : "text-gray-400 hover:text-red-500"
                    }`}
                >
                    <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                    <span>{likesCount}</span>
                </Button>

                <Link href={`/feed?post=${post.id}`}>
                    <Button
                        variant="ghost"
                        className="flex items-center space-x-2 text-gray-400 hover:text-blue-400"
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span>{post.commentsCount || 0}</span>
                    </Button>
                </Link>

                <Button
                    variant="ghost"
                    onClick={handleShare}
                    disabled={isSharing}
                    className="flex items-center space-x-2 text-gray-400 hover:text-green-400"
                >
                    <Share2 className="w-5 h-5" />
                    <span>{sharesCount}</span>
                </Button>
            </div>
        </article>
    );
}







