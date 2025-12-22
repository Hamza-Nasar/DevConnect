"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PollComponent from "@/components/post/PollComponent";

interface PostContentProps {
    post: any;
    postSummary: string | null;
    selectedPollOption: string | null;
    pollVotes: any[];
    totalPollVotes: number;
    handlePollVote: (index: number) => void;
    explanation?: string | null;
    isExplaining?: boolean;
    onExplainCode?: () => void;
    onFormatCode?: () => void;
}

export default function PostContent({
    post,
    postSummary,
    selectedPollOption,
    pollVotes,
    totalPollVotes,
    handlePollVote,
    explanation,
    isExplaining,
    onExplainCode,
    onFormatCode,
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

            {/* Code Snippet */}
            {post.codeSnippet && (
                <div className="mt-4 rounded-xl overflow-hidden border border-gray-700 bg-gray-900 shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                                {post.codeSnippet.language}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onFormatCode}
                                className="text-[10px] uppercase tracking-wider font-bold text-gray-400 hover:text-white transition px-2 py-1 rounded hover:bg-gray-700"
                            >
                                Format
                            </button>
                            <button
                                onClick={onExplainCode}
                                disabled={isExplaining}
                                className="text-[10px] uppercase tracking-wider font-bold text-purple-400 hover:text-purple-300 transition px-2 py-1 rounded hover:bg-purple-500/10 flex items-center gap-1"
                            >
                                <Zap size={10} className={isExplaining ? "animate-pulse" : ""} />
                                {isExplaining ? "Explaining..." : "Explain"}
                            </button>
                        </div>
                    </div>
                    <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto bg-[#0d1117]">
                        <code>{post.codeSnippet.code}</code>
                    </pre>

                    {/* AI Explanation */}
                    <AnimatePresence>
                        {explanation && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="bg-purple-500/5 border-t border-purple-500/10 p-4"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0 p-1.5 rounded-lg bg-purple-500/20 text-purple-400 mt-0.5">
                                        <Zap size={14} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">AI Explanation</h4>
                                        <p className="text-sm text-gray-300 leading-relaxed italic">
                                            {explanation}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Main Content */}
            <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{post.content}</p>

            {/* Poll */}
            {post.type === "poll" && post.pollOptions && (
                <PollComponent
                    poll={{
                        question: post.title || "Poll",
                        options: post.pollOptions.map((opt: any, idx: number) => ({
                            id: idx,
                            text: opt.option,
                            votes: opt.votes || 0
                        })),
                        totalVotes: totalPollVotes,
                        userVote: post.userPollVote // Assuming this comes from backend eventually
                    }}
                    pollId={post.id}
                    postId={post.id}
                />
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
                        <Badge key={tag} variant="default" className="bg-gray-800/50 hover:bg-purple-500/10 hover:text-purple-400 cursor-pointer transition">
                            #{tag}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
