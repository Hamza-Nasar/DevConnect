// app/(main)/feed/page.tsx
"use client"; // ← important

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CreatePost from "./components/CreatePost";
import { useEffect } from "react";

export default function FeedPage() {
    const { status } = useSession();
    const router = useRouter();

    // Redirect if unauthenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    if (status === "loading") {
        return <div>Loading...</div>; // wait for session to load
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <h1 className="text-3xl font-bold mb-6">DevConnect Feed 🚀</h1>
            <CreatePost />
            {/* Posts list goes here */}
        </div>
    );
}
