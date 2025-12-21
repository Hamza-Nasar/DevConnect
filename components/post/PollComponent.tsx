"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { BarChart3 } from "lucide-react";

interface PollOption {
    id: number;
    text: string;
    votes: number;
}

interface Poll {
    question: string;
    options: PollOption[];
    expiresAt?: string;
    userVote?: number;
    totalVotes: number;
}

interface PollComponentProps {
    poll: Poll;
    pollId: string;
    postId: string;
}

export default function PollComponent({ poll, pollId, postId }: PollComponentProps) {
    const { data: session } = useSession();
    const [localPoll, setLocalPoll] = useState(poll);
    const [isVoting, setIsVoting] = useState(false);
    const [hasVoted, setHasVoted] = useState(!!poll.userVote);

    const handleVote = async (optionId: number) => {
        if (!session || hasVoted || isVoting) return;

        setIsVoting(true);

        // Optimistic update
        const updatedOptions = localPoll.options.map((opt) =>
            opt.id === optionId
                ? { ...opt, votes: opt.votes + 1 }
                : opt
        );
        setLocalPoll({
            ...localPoll,
            options: updatedOptions,
            totalVotes: localPoll.totalVotes + 1,
            userVote: optionId,
        });
        setHasVoted(true);

        try {
            const res = await fetch("/api/polls", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pollId, optionId }),
            });

            if (!res.ok) {
                // Rollback on error
                setLocalPoll(poll);
                setHasVoted(false);
            }
        } catch (error) {
            console.error("Error voting:", error);
            // Rollback
            setLocalPoll(poll);
            setHasVoted(false);
        } finally {
            setIsVoting(false);
        }
    };

    const getPercentage = (votes: number) => {
        if (localPoll.totalVotes === 0) return 0;
        return Math.round((votes / localPoll.totalVotes) * 100);
    };

    return (
        <div className="mt-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="flex items-center space-x-2 mb-3">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">{localPoll.question}</h3>
            </div>

            <div className="space-y-2">
                {localPoll.options.map((option) => {
                    const percentage = getPercentage(option.votes);
                    const isSelected = hasVoted && localPoll.userVote === option.id;

                    return (
                        <button
                            key={option.id}
                            onClick={() => handleVote(option.id)}
                            disabled={hasVoted || isVoting}
                            className={`w-full p-3 rounded-lg border-2 transition text-left ${
                                isSelected
                                    ? "border-blue-500 bg-blue-500/20"
                                    : hasVoted
                                    ? "border-gray-600 bg-gray-700/50 cursor-not-allowed"
                                    : "border-gray-600 hover:border-blue-500 hover:bg-gray-700/50"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-white">{option.text}</span>
                                {hasVoted && (
                                    <span className="text-sm text-gray-400">
                                        {percentage}%
                                    </span>
                                )}
                            </div>
                            {hasVoted && (
                                <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-blue-500 h-full transition-all duration-300"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {hasVoted && (
                <p className="text-xs text-gray-400 mt-3">
                    {localPoll.totalVotes} {localPoll.totalVotes === 1 ? "vote" : "votes"}
                </p>
            )}

            {localPoll.expiresAt && new Date(localPoll.expiresAt) > new Date() && (
                <p className="text-xs text-gray-500 mt-2">
                    Poll expires {new Date(localPoll.expiresAt).toLocaleString()}
                </p>
            )}
        </div>
    );
}







