"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CreatePost from "./components/CreatePost";
import PostList from "./components/PostList";
import Navbar from "@/components/navbar/Navbar";
import StoriesBar from "@/components/stories/StoriesBar";
import { PageTransition } from "@/components/animations/PageTransition";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { motion } from "framer-motion";
import getSocket from "@/lib/socket";

export default function FeedPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && !(session?.user as any)?.username) {
            router.push("/profile-setup");
        }
    }, [status, session, router]);

    // Ensure socket connection and join user room for real-time updates
    useEffect(() => {
        if (status === "authenticated" && session?.user?.id) {
            const socket = getSocket();
            if (socket) {
                // Join user room for real-time notifications
                socket.emit("join", session.user.id);

                socket.on("connect", () => {
                    socket.emit("join", session.user?.id || "");
                });
            }
        }
    }, [status, session?.user?.id]);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="flex items-center justify-center h-screen">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-gray-400">Loading feed...</p>
                    </div>
                </div>
            </div>
        );
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this post?")) return;

        setIsDeleting(id);
        try {
            const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            // PostList will handle the UI update via WebSocket
        } catch (err) {
            console.error("❌ Error deleting post:", err);
            alert("Failed to delete post. Please try again.");
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 -right-4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                </div>

                <Navbar />

                {/* Main Content Area with Responsive Layout - Account for Navbar Sidebar */}
                <div className="relative z-10 pt-16 lg:pl-72 xl:pl-80">
                    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 xl:px-10 py-4 sm:py-6 lg:py-10">
                        {/* Main Feed Content - Centered */}
                        <main className="max-w-2xl mx-auto">
                            {/* Stories Bar */}
                            {session && (
                                <ScrollReveal delay={0.1}>
                                    <div className="mb-4 sm:mb-6">
                                        <StoriesBar />
                                    </div>
                                </ScrollReveal>
                            )}

                            {/* Create Post Section */}
                            {session && (
                                <ScrollReveal delay={0.2}>
                                    <div className="mb-4 sm:mb-6">
                                        <CreatePost />
                                    </div>
                                </ScrollReveal>
                            )}

                            {/* Feed Filters - Enhanced Design */}
                            <ScrollReveal delay={0.3}>
                                <div className="mb-4 sm:mb-6">
                                    <div className="bg-gray-800/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-gray-700/50">
                                        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                                            {[
                                                { label: "All", icon: "🔥" },
                                                { label: "Following", icon: "👥" },
                                                { label: "Trending", icon: "📈" },
                                                { label: "Latest", icon: "🆕" },
                                                { label: "Top", icon: "⭐" },
                                                { label: "Photos", icon: "📷" },
                                                { label: "Videos", icon: "🎥" },
                                                { label: "Polls", icon: "📊" },
                                            ].map((filter) => (
                                                <motion.button
                                                    key={filter.label}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gray-700/50 backdrop-blur-sm text-gray-300 hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white whitespace-nowrap transition-all duration-300 text-xs sm:text-sm font-medium border border-gray-600/50 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
                                                >
                                                    <span>{filter.icon}</span>
                                                    <span>{filter.label}</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>

                            {/* Feed Posts */}
                            <ScrollReveal delay={0.4}>
                                <div className="space-y-4 sm:space-y-6">
                                    <PostList onDelete={handleDelete} />
                                </div>
                            </ScrollReveal>
                        </main>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
