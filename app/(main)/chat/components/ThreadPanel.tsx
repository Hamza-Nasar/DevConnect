"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MessageItem from "./MessageItem";
import { Message } from "@/types/chat";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

interface ThreadPanelProps {
    parentMessage: Message;
    onClose: () => void;
    onSendMessage: (content: string, parentId: string) => Promise<void>;
    formatContent: (content: string) => React.ReactNode;
}

export default function ThreadPanel({
    parentMessage,
    onClose,
    onSendMessage,
    formatContent
}: ThreadPanelProps) {
    const { data: session } = useSession();
    const [replies, setReplies] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyInput, setReplyInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchReplies();
    }, [parentMessage.id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [replies]);

    const fetchReplies = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/messages/threads?parentMessageId=${parentMessage.id}`);
            if (res.ok) {
                const data = await res.json();
                setReplies(data.replies);
            }
        } catch (error) {
            console.error("Error fetching replies:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendReply = async () => {
        if (!replyInput.trim() || isSending) return;

        setIsSending(true);
        try {
            await onSendMessage(replyInput.trim(), parentMessage.id);
            setReplyInput("");
            // Refresh replies
            fetchReplies();
        } catch (error) {
            toast.error("Failed to send reply");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-gray-900 border-l border-gray-800 z-50 flex flex-col shadow-2xl"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md">
                <div>
                    <h3 className="text-lg font-semibold text-white">Thread</h3>
                    <p className="text-xs text-gray-400">Replying to {parentMessage.sender?.name}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-gray-400 hover:text-white">
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Parent Message */}
                <div className="pb-4 border-b border-gray-800/50">
                    <MessageItem
                        message={parentMessage}
                        isOwn={parentMessage.senderId === session?.user?.id}
                        showAvatar={true}
                        onReaction={() => { }}
                        onReply={() => { }}
                        formatContent={formatContent}
                    />
                </div>

                {/* Replies */}
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                    </div>
                ) : replies.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 italic text-sm">
                        No replies yet. Be the first to reply!
                    </div>
                ) : (
                    <div className="space-y-4">
                        {replies.map((reply) => (
                            <MessageItem
                                key={reply.id}
                                message={reply}
                                isOwn={reply.senderId === session?.user?.id}
                                showAvatar={true}
                                onReaction={() => { }} // Could be added later
                                onReply={() => { }}
                                formatContent={formatContent}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-md">
                <div className="flex items-end gap-2 bg-gray-800 rounded-2xl p-2 border border-gray-700 focus-within:border-purple-500 transition-colors">
                    <textarea
                        placeholder="Reply to thread..."
                        value={replyInput}
                        onChange={(e) => setReplyInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply();
                            }
                        }}
                        rows={1}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white resize-none max-h-32 py-2 px-3 no-scrollbar"
                    />
                    <Button
                        size="icon"
                        onClick={handleSendReply}
                        disabled={!replyInput.trim() || isSending}
                        className="h-10 w-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0 disabled:opacity-50"
                    >
                        {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
