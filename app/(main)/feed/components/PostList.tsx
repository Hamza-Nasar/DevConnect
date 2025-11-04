"use client";

import { useEffect, useState } from "react";
import PostItem from "./PostItem";

interface Post {
    id: string;
    title: string;
    content: string;
    user: { name: string };
    comments: any[];
    likedBy: any[];
}

export default function PostList() {
    const [posts, setPosts] = useState<Post[]>([]);

    useEffect(() => {
        fetch("/api/posts")
            .then(res => res.json())
            .then(data => setPosts(data));
    }, []);

    if (!posts.length) return <p>No posts yet</p>;

    return (
        <div className="space-y-4">
            {posts.map(post => (
                <PostItem key={post.id} post={post} />
            ))}
        </div>
    );
}
