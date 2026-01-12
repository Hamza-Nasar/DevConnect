"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Smile,
    Reply,
    MoreHorizontal,
    Check,
    CheckCheck,
    FileText,
    Edit2,
    Trash2,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import RealTimeAvatar from "@/components/avatar/RealTimeAvatar";
import { formatTimeAgo } from "@/lib/utils";
import { Message, MessageReaction } from "@/types/chat";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MessageItemProps {
    message: Message;
    isOwn: boolean;
    showAvatar: boolean;
    onReaction: (emoji: string) => void;
    onReply: () => void;
    onEdit?: (content: string) => void;
    onDelete?: () => void;
    formatContent: (content: string) => React.ReactNode;
}

const COMMON_EMOJIS = ["❤️", "👍", "🔥", "😂", "😮", "😢"];

export default function MessageItem({
    message,
    isOwn,
    showAvatar,
    onReaction,
    onReply,
    onEdit,
    onDelete,
    formatContent
}: MessageItemProps) {
    const [showReactions, setShowReactions] = useState(false);
    const [isLongPressed, setIsLongPressed] = useState(false);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    const handleTouchStart = () => {
        longPressTimer.current = setTimeout(() => {
            setIsLongPressed(true);
            // Vibrate if supported
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`group flex w-full ${isOwn ? "justify-end" : "justify-start"} mb-2 px-2 sm:px-4 relative`}
        >
            <div
                className={`flex items-end gap-2 max-w-[90%] sm:max-w-[85%] lg:max-w-[75%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleTouchStart}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
            >
                {showAvatar && !isOwn && (
                    <RealTimeAvatar
                        userId={message.sender?.id}
                        src={message.sender?.avatar}
                        alt={message.sender?.name || "User"}
                        size="sm"
                        className="flex-shrink-0"
                    />
                )}
                {!showAvatar && !isOwn && <div className="w-8 flex-shrink-0" />}

                <div className="flex flex-col gap-1 relative">
                    {/* Reaction Overlay (Quick Select) */}
                    <AnimatePresence>
                        {(showReactions || isLongPressed) && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: -45, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                className={`absolute ${isOwn ? "right-0" : "left-0"} z-50 bg-gray-800 border border-gray-700 rounded-full p-1 shadow-xl flex gap-1`}
                            >
                                {COMMON_EMOJIS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => {
                                            onReaction(emoji);
                                            setShowReactions(false);
                                            setIsLongPressed(false);
                                        }}
                                        className="hover:bg-gray-700 p-1.5 rounded-full transition text-lg leading-none"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                                {isLongPressed && (
                                    <button
                                        onClick={() => setIsLongPressed(false)}
                                        className="p-1.5 text-gray-400 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Media Content */}
                    {message.type === "image" && message.imageUrl && (
                        <div className="rounded-2xl overflow-hidden max-w-xs mb-1 shadow-lg">
                            <img
                                src={message.imageUrl}
                                alt="Shared"
                                className="w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-95"
                                onClick={() => window.open(message.imageUrl, '_blank')}
                            />
                        </div>
                    )}

                    {message.type === "video" && message.videoUrl && (
                        <div className="rounded-2xl overflow-hidden max-w-xs mb-1 shadow-lg">
                            <video src={message.videoUrl} controls className="w-full max-h-64" />
                        </div>
                    )}

                    {message.type === "file" && (
                        <div className="flex items-center gap-3 p-3 bg-gray-800/80 rounded-2xl mb-1 border border-gray-700">
                            <FileText className="h-6 w-6 text-blue-400" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{message.fileName}</p>
                                <a href={message.fileUrl} download className="text-xs text-blue-400 hover:text-blue-300">Download</a>
                            </div>
                        </div>
                    )}

                    {/* Message Bubble */}
                    <div
                        className={`relative rounded-2xl px-4 py-2.5 transition-all max-w-xs sm:max-w-sm lg:max-w-md ${isOwn
                            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-md rounded-bl-2xl rounded-tr-2xl rounded-tl-md shadow-lg"
                            : "bg-gray-800 text-gray-100 rounded-bl-md rounded-br-2xl rounded-tr-2xl rounded-tl-md border border-gray-700/50 shadow-md"
                            } ${isLongPressed ? "ring-2 ring-purple-500 scale-[0.98]" : ""}`}
                    >
                        {message.type === "text" && (
                            <div className="text-sm prose prose-invert max-w-none">
                                {formatContent(message.content)}
                            </div>
                        )}

                        <div className={`flex items-center gap-1.5 mt-1 text-[10px] ${isOwn ? "text-white/70" : "text-gray-400"}`}>
                            <span>{formatTimeAgo(message.createdAt)}</span>
                            {isOwn && (
                                <span>
                                    {message.read ? (
                                        <CheckCheck className="h-3 w-3 text-blue-400" />
                                    ) : message.delivered ? (
                                        <CheckCheck className="h-3 w-3" />
                                    ) : (
                                        <Check className="h-3 w-3" />
                                    )}
                                </span>
                            )}
                            {message.edits && message.edits.length > 0 && <span>(edited)</span>}
                        </div>

                        {/* Actions Menu Trigger - Desktop (Hover) & Mobile (Long Press Indicator) */}
                        <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? "right-full mr-2" : "left-full ml-2"} flex items-center gap-1 ${isLongPressed ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-white/10"
                                onClick={() => setShowReactions(!showReactions)}
                            >
                                <Smile className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full hover:bg-white/10"
                                onClick={onReply}
                            >
                                <Reply className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isOwn ? "end" : "start"} className="bg-gray-800 border-gray-700 text-white">
                                    {isOwn && (
                                        <DropdownMenuItem onClick={() => onEdit?.(message.content)} className="hover:bg-gray-700">
                                            <Edit2 className="h-4 w-4 mr-2" /> Edit
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="hover:bg-gray-700">
                                        <Reply className="h-4 w-4 mr-2" /> Forward
                                    </DropdownMenuItem>
                                    {isOwn && (
                                        <DropdownMenuItem onClick={onDelete} className="text-red-400 hover:bg-red-500/10 hover:text-red-300">
                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Display Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                            {message.reactions.map((reaction, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onReaction(reaction.emoji)}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition border ${
                                        // @ts-ignore (checking if user reacted)
                                        reaction.users?.includes(message.senderId)
                                            ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
                                            : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                                        }`}
                                >
                                    <span>{reaction.emoji}</span>
                                    <span>{reaction.count}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
