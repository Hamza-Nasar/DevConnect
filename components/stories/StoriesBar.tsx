"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getSocket } from "@/lib/socket";

interface Story {
    id: string;
    userId: string;
    user: {
        id: string;
        name?: string;
        avatar?: string;
        image?: string;
    };
    image?: string;
    video?: string;
    text?: string;
    views: number;
    createdAt: string;
}

export default function StoriesBar() {
    const { data: session } = useSession();
    const [stories, setStories] = useState<Story[]>([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const fetchStories = async () => {
            try {
                const res = await fetch("/api/stories");
                if (res.ok) {
                    const data = await res.json();
                    setStories(data.stories || []);
                }
            } catch (error) {
                console.error("Error fetching stories:", error);
            } finally {
                setLoading(false);
            }
        };

        if (session) {
            fetchStories();

            const socket = getSocket();
            if (socket) {
                const handleNewStory = (newStory: Story) => {
                    setStories((prev) => [newStory, ...prev]);
                };

                socket.on("new_story", handleNewStory);
                return () => {
                    socket.off("new_story", handleNewStory);
                };
            }
        }
    }, [session]);

    if (loading || stories.length === 0) {
        return null; // Hide if no stories
    }

    return (
        <div className="mb-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
            <div className="flex items-center space-x-4 overflow-x-auto scrollbar-hide">
                {/* Create Story */}
                {session && (
                    <Link
                        href="/stories/create"
                        className="flex-shrink-0 flex flex-col items-center space-y-2 group"
                    >
                        <div className="relative">
                            {session.user?.image ? (
                                <img
                                    src={session.user.image || ""}
                                    alt={session.user.name || "You"}
                                    className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-600 group-hover:ring-blue-500 transition"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xl">
                                    {(session.user?.name || "U")[0].toUpperCase()}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-gray-800">
                                <Plus className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <span className="text-xs text-gray-400 group-hover:text-white transition">
                            Your Story
                        </span>
                    </Link>
                )}

                {/* Other Stories */}
                {stories.map((story) => (
                    <Link
                        key={story.id}
                        href={`/stories/${story.id}`}
                        className="flex-shrink-0 flex flex-col items-center space-y-2 group"
                    >
                        <div className="relative">
                            {story.user.avatar || story.user.image ? (
                                <img
                                    src={story.user.avatar || story.user.image || ""}
                                    alt={story.user.name || "User"}
                                    className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-500 group-hover:ring-blue-400 transition"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                    {(story.user.name || "U")[0].toUpperCase()}
                                </div>
                            )}
                            {story.views === 0 && (
                                <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-pulse" />
                            )}
                        </div>
                        <span className="text-xs text-gray-400 group-hover:text-white transition truncate max-w-[64px]">
                            {story.user.name || "User"}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

