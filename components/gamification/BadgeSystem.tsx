"use client";

import { Trophy, Star, Zap, TrendingUp, Heart } from "lucide-react";

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    unlocked: boolean;
    progress?: number;
}

interface BadgeSystemProps {
    userId: string;
}

export default function BadgeSystem({ userId }: BadgeSystemProps) {
    // This would fetch from API
    const badges: Badge[] = [
        {
            id: "first_post",
            name: "First Steps",
            description: "Created your first post",
            icon: <Star className="w-6 h-6" />,
            color: "text-yellow-400",
            unlocked: true,
        },
        {
            id: "popular",
            name: "Popular",
            description: "Got 100 likes on a post",
            icon: <Heart className="w-6 h-6" />,
            color: "text-red-400",
            unlocked: false,
            progress: 45,
        },
        {
            id: "influencer",
            name: "Influencer",
            description: "Reach 1000 followers",
            icon: <TrendingUp className="w-6 h-6" />,
            color: "text-blue-400",
            unlocked: false,
            progress: 23,
        },
        {
            id: "power_user",
            name: "Power User",
            description: "Post 50 times",
            icon: <Zap className="w-6 h-6" />,
            color: "text-purple-400",
            unlocked: false,
            progress: 12,
        },
    ];

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
            <div className="flex items-center space-x-2 mb-6">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h2 className="text-2xl font-bold text-white">Badges & Achievements</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {badges.map((badge) => (
                    <div
                        key={badge.id}
                        className={`p-4 rounded-lg border-2 transition ${
                            badge.unlocked
                                ? "border-yellow-400 bg-yellow-400/10"
                                : "border-gray-700 bg-gray-700/50 opacity-60"
                        }`}
                    >
                        <div className={`${badge.color} mb-2`}>{badge.icon}</div>
                        <h3 className="font-semibold text-white text-sm mb-1">{badge.name}</h3>
                        <p className="text-xs text-gray-400 mb-2">{badge.description}</p>
                        {!badge.unlocked && badge.progress !== undefined && (
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition"
                                    style={{ width: `${badge.progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}







