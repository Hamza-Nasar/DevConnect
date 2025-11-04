"use client";

interface Props {
    post: any;
}

export default function PostItem({ post }: { post: any }) {
    return (
        <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold">{post.title}</h2>
            <p>{post.content}</p>
            <p className="text-sm text-gray-400">By: {post.user?.name || "Unknown"}</p>

            <p className="text-sm text-gray-400">
                Comments: {post.comments?.length ?? 0}
            </p>

            <p className="text-sm text-gray-400">
                Likes: {post.likedBy?.length ?? 0}
            </p>
        </div>
    );
}


