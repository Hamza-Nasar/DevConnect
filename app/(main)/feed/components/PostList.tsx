"use client";
import { useEffect, useState } from "react";

export default function PostList() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchPosts() {
        try {
            const res = await fetch("/api/posts", { cache: "no-store" });
            const data = await res.json();
            console.log("📦 API response:", data);
            setPosts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching posts:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchPosts();

        // 🔄 Listen for new posts and refresh automatically
        window.addEventListener("postCreated", fetchPosts);
        return () => window.removeEventListener("postCreated", fetchPosts);
    }, []);

    if (loading) return <p>Loading posts...</p>;
    if (posts.length === 0) return <p>No posts yet.</p>;

    return (
        <div className="space-y-4">
            {posts.map((post) => (
                <div
                    key={post.id}
                    className="p-4 bg-gray-800 rounded-lg shadow-md border border-gray-700"
                >
                    <div className="flex items-center mb-2">
                        <img
                            src={post.user?.image || "/default-avatar.png"}
                            alt={post.user?.name || "User"}
                            className="w-8 h-8 rounded-full mr-2"
                        />
                        <span className="font-semibold">
                            {post.user?.name || "Unknown"}
                        </span>
                    </div>
                    <h2 className="text-lg font-bold">{post.title || "(No title)"}</h2>
                    <p className="text-gray-300">{post.content || "(No content)"}</p>

                    <p className="text-sm text-gray-500 mt-1">
                        {new Date(post.createdAt).toLocaleString()}
                    </p>
                </div>
            ))}
        </div>
    );
}
