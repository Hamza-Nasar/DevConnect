"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import CreatePost from "./components/CreatePost";
import PostList from "./components/PostList"; // ✅ import this

export default function FeedPage() {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    if (status === "loading") return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-800 text-white p-6">
            <h1 className="text-3xl font-bold mb-6">DevConnect Feed 🚀</h1>

            <CreatePost />
            <div className="mt-8">
                <PostList /> {/* ✅ show all posts below */}
            </div>
        </div>
    );
}
