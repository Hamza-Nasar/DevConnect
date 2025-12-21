"use client";

import { useEffect, useState } from "react";
import getSocket from "@/lib/socket";

interface TypingIndicatorProps {
    conversationId: string;
    userId: string;
}

export default function TypingIndicator({ conversationId, userId }: TypingIndicatorProps) {
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useState<NodeJS.Timeout | null>(null)[0];

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        socket.emit("join_conversation", conversationId);

        socket.on("user_typing", (data: { userId: string; conversationId: string }) => {
            if (data.conversationId === conversationId && data.userId !== userId) {
                setTypingUsers((prev) => {
                    if (!prev.includes(data.userId)) {
                        return [...prev, data.userId];
                    }
                    return prev;
                });

                // Remove after 3 seconds
                setTimeout(() => {
                    setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
                }, 3000);
            }
        });

        socket.on("user_stopped_typing", (data: { userId: string; conversationId: string }) => {
            if (data.conversationId === conversationId) {
                setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
            }
        });

        return () => {
            socket.emit("leave_conversation", conversationId);
            socket.off("user_typing");
            socket.off("user_stopped_typing");
        };
    }, [conversationId, userId]);

    const handleTyping = (value: string) => {
        const socket = getSocket();
        if (!socket) return;

        if (value.length > 0 && !isTyping) {
            setIsTyping(true);
            socket.emit("typing", {
                conversationId,
                userId,
            });
        }

        // Clear existing timeout
        if (typingTimeoutRef) {
            clearTimeout(typingTimeoutRef);
        }

        // Set new timeout to stop typing
        const timeout = setTimeout(() => {
            setIsTyping(false);
            socket.emit("stop_typing", {
                conversationId,
                userId,
            });
        }, 1000);

        // @ts-ignore
        typingTimeoutRef = timeout;
    };

    if (typingUsers.length === 0) return null;

    return (
        <div className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-400">
            <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span>
                {typingUsers.length === 1
                    ? "Someone is typing..."
                    : `${typingUsers.length} people are typing...`}
            </span>
        </div>
    );
}

export { TypingIndicator };







