"use client";
import { useState } from "react";

export default function CreatePost() {
    const [content, setContent] = useState("");

    const handleSubmit = async () => {
        if (!content) return;

        await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
        });

        setContent("");
        window.location.reload(); // simple refresh to show new post
    };

    return (
        <div className="bg-gray-800 p-4 rounded-xl mb-6">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white"
                placeholder="What's on your mind?"
            />
            <button
                onClick={handleSubmit}
                className="mt-2 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
            >
                Post
            </button>
        </div>
    );
}
