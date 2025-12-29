"use client";

import { useSession } from "next-auth/react";

// Force dynamic rendering to avoid SSR issues
export const dynamic = "force-dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
// CreatePost removed from home - available on /create-post page
import PostList from "./components/PostList";
import Navbar from "@/components/navbar/Navbar";
import StoriesBar from "@/components/stories/StoriesBar";
import { PageTransition } from "@/components/animations/PageTransition";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { motion } from "framer-motion";
import getSocket from "@/lib/socket";
import { BackgroundAnimation } from "@/components/animations/BackgroundAnimation";

export default function FeedPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState("All");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated") {
            // Only redirect to profile setup if username is missing
            // This should only happen on first signup/login, not on subsequent logins
            // If user already has username in session, they've completed setup
            if (!(session?.user as any)?.username) {

                // Check localStorage to see if user has completed setup before
                const hasCompletedSetup = localStorage.getItem('profileSetupCompleted');
                if (!hasCompletedSetup) {
                    router.push("/profile-setup");
                }
            }

            // Handle postId from URL (for notifications)
            const urlParams = new URLSearchParams(window.location.search);
            const postId = urlParams.get('postId');
            if (postId) {
                setTimeout(() => {
                    const postElement = document.getElementById(`post-${postId}`);
                    if (postElement) {
                        postElement.scrollIntoView({ behavior: "smooth", block: "center" });
                        postElement.classList.add("ring-2", "ring-purple-500", "ring-opacity-75", "rounded-lg");
                        setTimeout(() => {
                            postElement.classList.remove("ring-2", "ring-purple-500", "ring-opacity-75");
                        }, 3000);
                    }
                    // Clean up URL
                    window.history.replaceState({}, '', '/feed');
                }, 1000);
            }
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
            <div className="min-h-screen bg-gray-950 relative">
                <BackgroundAnimation />
                <Navbar />

                <div className="relative z-10 pt-16 lg:pl-72 xl:pl-80 pb-20 lg:pb-0">
                    <div className="max-w-7xl mx-auto px-4 py-6">
                        <main className="max-w-2xl mx-auto">
                            {session && (
                                <ScrollReveal delay={0.1}>
                                    <div className="mb-6"><StoriesBar /></div>
                                </ScrollReveal>
                            )}

                            <ScrollReveal delay={0.2}>
                                <div className="mb-6">
                                    <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50 shadow-2xl">
                                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                            {[
                                                { label: "All", icon: "🔥" },
                                                { label: "Trending", icon: "📈" },
                                                { label: "Latest", icon: "🆕" },
                                                { label: "Photos", icon: "📷" },
                                                { label: "Videos", icon: "🎥" },
                                                { label: "Polls", icon: "📊" },
                                            ].map((filter) => (
                                                <motion.button
                                                    key={filter.label}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setActiveFilter(filter.label)}
                                                    className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-300 text-sm font-medium border flex items-center gap-2 flex-shrink-0 ${activeFilter === filter.label
                                                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-purple-500 shadow-lg shadow-purple-500/20"
                                                        : "bg-gray-700/50 text-gray-400 border-gray-600/50 hover:bg-gray-700 hover:text-white"
                                                        }`}
                                                >
                                                    <span>{filter.icon}</span>
                                                    <span>{filter.label}</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>

                            <ScrollReveal delay={0.4}>
                                <PostList onDelete={handleDelete} filter={activeFilter} />
                            </ScrollReveal>
                        </main>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
