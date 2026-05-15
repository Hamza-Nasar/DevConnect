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
    const [showActivationCard, setShowActivationCard] = useState(false);

    useEffect(() => {
        const run = async () => {
            if (status === "unauthenticated") {
                router.push("/login");
                return;
            }

            if (status !== "authenticated") return;

            // Reliable profile-completion check from DB (not only session/localStorage).
            // Session can be stale after relogin for OAuth users.
            try {
                const basicRes = await fetch("/api/profile/basic", { cache: "no-store" });
                if (basicRes.ok) {
                    const profile = await basicRes.json();
                    const hasUsername = !!profile?.username;
                    if (hasUsername) {
                        localStorage.setItem("profileSetupCompleted", "true");
                    } else {
                        router.push("/profile-setup");
                        return;
                    }
                } else {
                    const hasCompletedSetup = localStorage.getItem("profileSetupCompleted") === "true";
                    if (!hasCompletedSetup) {
                        router.push("/profile-setup");
                        return;
                    }
                }
            } catch {
                const hasCompletedSetup = localStorage.getItem("profileSetupCompleted") === "true";
                if (!hasCompletedSetup) {
                    router.push("/profile-setup");
                    return;
                }
            }

            // Handle postId from URL (for notifications)
            const urlParams = new URLSearchParams(window.location.search);
            const postId = urlParams.get("postId");
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
                    window.history.replaceState({}, "", "/feed");
                }, 1000);
            }
        };

        void run();
    }, [status, router]);

    useEffect(() => {
        if (status !== "authenticated") return;
        const isDone = localStorage.getItem("activationFirstActionDone") === "1";
        const dismissed = localStorage.getItem("activationCardDismissed") === "1";
        setShowActivationCard(!isDone && !dismissed);
    }, [status]);

    // Ensure socket connection and join user room for real-time updates
    useEffect(() => {
        if (status === "authenticated" && session?.user?.id) {
            const socket = getSocket();
            if (socket) {
                // Join user room for real-time notifications
                socket.emit("join", session.user.id);

                const onConnect = () => {
                    socket.emit("join", session.user?.id || "");
                };

                socket.on("connect", onConnect);
                return () => {
                    socket.off("connect", onConnect);
                };
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
                                                { label: "Need Help", icon: "🆘" },
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

                            {showActivationCard && (
                                <ScrollReveal delay={0.3}>
                                    <div className="mb-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-blue-200">First Action Goal</p>
                                                <p className="text-xs text-blue-100/80">Create your first post in the next 10 minutes to unlock personalized feed learning.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => router.push("/create-post?type=need_help")}
                                                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                                                >
                                                    Ask Need Help
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        localStorage.setItem("activationCardDismissed", "1");
                                                        setShowActivationCard(false);
                                                    }}
                                                    className="rounded-lg border border-gray-600 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800"
                                                >
                                                    Dismiss
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            )}

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
