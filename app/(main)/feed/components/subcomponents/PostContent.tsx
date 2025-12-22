"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface PostContentProps {
    post: any;
    postSummary: string | null;
    selectedPollOption: string | null;
    pollVotes: any[];
    totalPollVotes: number;
    handlePollVote: (index: number) => void;
}

export default function PostContent({
    post,
    postSummary,
    selectedPollOption,
    pollVotes,
    totalPollVotes,
    handlePollVote,
}: PostContentProps) {
    return (
        <div className="space-y-4">
            {/* Title */}
            {post.title && <h3 className="text-xl font-bold text-white mb-2">{post.title}</h3>}

            {/* AI Summary */}
            {postSummary && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-purple-400" />
                        <span className="text-xs font-bold text-purple-400 uppercase">AI Summary</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{postSummary}</p>
                </motion.div>
            )}

            {/* Main Content */}
            <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{post.content}</p>

            {/* Poll */}
            {post.type === "poll" && post.pollOptions && (
                <div className="space-y-3 p-4 bg-gray-800/40 rounded-xl border border-gray-700/50">
                    {pollVotes.map((opt, i) => {
                        const percentage = totalPollVotes === 0 ? 0 : Math.round((opt.votes / totalPollVotes) * 100);
                        const isSelected = selectedPollOption === opt.option;

                        return (
                            <div key={i} className="space-y-1.5 cursor-pointer group" onClick={() => handlePollVote(i)}>
                                <div className="flex justify-between text-sm">
                                    <span className={`font-medium ${isSelected ? "text-purple-400" : "text-gray-300"}`}>{opt.option}</span>
                                    <span className="text-gray-500">{percentage}%</span>
                                </div>
                                <div className="relative h-2 w-full bg-gray-700/50 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        className={`h-full ${isSelected ? "bg-gradient-to-r from-purple-500 to-blue-500" : "bg-gray-600"} transition-all`}
                                    />
                                </div>
                            </div>
                        );
                    })}
                    <div className="text-xs text-gray-500 mt-2">{totalPollVotes} votes</div>
                </div>
            )}

            {/* Images */}
            {post.images && post.images.length > 0 && (
                <div className={`grid gap-2 ${post.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                    {post.images.map((img: string, i: number) => (
                        <img key={i} src={img} alt="" className="w-full h-auto max-h-[500px] object-cover rounded-xl border border-gray-800" />
                    ))}
                </div>
            )}

            {/* Link Preview */}
            {post.linkPreview && (
                <a href={post.linkPreview.url} target="_blank" rel="noopener" className="block border border-gray-700 rounded-xl overflow-hidden bg-gray-800/30 hover:bg-gray-800/50 transition group">
                    {post.linkPreview.image && <img src={post.linkPreview.image} alt="" className="w-full h-48 object-cover border-b border-gray-700" />}
                    <div className="p-4">
                        <h4 className="font-semibold text-white mb-1 group-hover:text-purple-400 transition">{post.linkPreview.title}</h4>
                        <p className="text-sm text-gray-400 line-clamp-2">{post.linkPreview.description}</p>
                        <span className="text-xs text-purple-400 mt-2 block">{new URL(post.linkPreview.url).hostname}</span>
                    </div>
                </a>
            )}

            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                    {post.hashtags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="bg-gray-800/50 hover:bg-purple-500/10 hover:text-purple-400 cursor-pointer transition">
                            #{tag}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
