import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { toggleLike, findPostById, updatePost, findUserById, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";
import { getSocketInstance } from "@/lib/socket-server";

// Toggle like on a post
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { postId } = await req.json();
        if (!postId) {
            return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        const post = await findPostById(postId);
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const result = await toggleLike(session.user.id, postId);

        // Update post likes count
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const postIdObj = toObjectId(postId);
        if (postIdObj) {
            // Use $inc with upsert to ensure field exists
            await postsCollection.updateOne(
                { _id: postIdObj },
                {
                    $inc: { likesCount: result.liked ? 1 : -1 }
                }
            );

            // Ensure likesCount doesn't go below 0
            const updatedPost = await postsCollection.findOne({ _id: postIdObj });
            if (updatedPost && updatedPost.likesCount < 0) {
                await postsCollection.updateOne(
                    { _id: postIdObj },
                    { $set: { likesCount: 0 } }
                );
            }
        }

        // Create notification if liked
        if (result.liked && post.userId !== session.user.id) {
            const notificationsCollection = await getCollection(COLLECTIONS.NOTIFICATIONS);
            const user = await findUserById(session.user.id);
            await notificationsCollection.insertOne({
                userId: post.userId,
                type: "like",
                title: "New Like",
                message: `${user?.name || "Someone"} liked your post`,
                link: `/feed?post=${postId}`,
                read: false,
                createdAt: new Date(),
            });
        }

        // Get updated like count for real-time broadcast
        const likesCount = postIdObj
            ? (await postsCollection.findOne({ _id: postIdObj }))?.likesCount || 0
            : 0;

        // Emit real-time like update via Socket.io
        try {
            const io = getSocketInstance();
            if (io) {
                io.to(`post:${postId}`).emit("like_updated", {
                    postId: postId,
                    liked: result.liked,
                    userId: session.user.id,
                    likesCount,
                });

                // Notify post owner
                if (result.liked && post.userId !== session.user.id) {
                    io.to(`user:${post.userId}`).emit("post_liked", {
                        postId: postId,
                        liked: result.liked,
                    });
                }
            }
        } catch (error: any) {
            console.warn("⚠️ Could not emit like socket event:", error?.message);
        }

        return NextResponse.json({ liked: result.liked, likesCount });
    } catch (error: any) {
        console.error("Error toggling like:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
