"use client";
import { useState } from "react";

export default function NewPostForm() {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    // example in React
    async function handleSubmit(e) {
        e.preventDefault();

        const res = await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title,
                content,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            alert("Error: " + data.error);
        } else {
            console.log("Post created:", data);
        }
    }


    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border rounded mb-2"
            />
            <textarea
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-2 border rounded"
            />
            <button type="submit" className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">
                Post
            </button>
        </form>

    );
}
