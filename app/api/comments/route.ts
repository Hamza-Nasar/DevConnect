import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createComment, findCommentsByPostId, findPostById, findUserById, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";
import { getSocketInstance } from "@/lib/socket-server";

// Create a comment
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { postId, content } = await req.json();
        if (!postId || !content?.trim()) {
            return NextResponse.json({ error: "Post ID and content required" }, { status: 400 });
        }

        const post = await findPostById(postId);
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const comment = await createComment({
            postId: postId,
            userId: session.user.id,
            content: content.trim(),
        });

        // Update post comments count
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const postIdObj = toObjectId(postId);
        if (postIdObj) {
            await postsCollection.updateOne(
                { _id: postIdObj },
                { $inc: { commentsCount: 1 } }
            );
        }

        // Create notification
        if (post.userId !== session.user.id) {
            const notificationsCollection = await getCollection(COLLECTIONS.NOTIFICATIONS);
            const user = await findUserById(session.user.id);
            await notificationsCollection.insertOne({
                userId: post.userId,
                type: "comment",
                title: "New Comment",
                message: `${user?.name || "Someone"} commented on your post`,
                link: `/feed?post=${postId}`,
                read: false,
                createdAt: new Date(),
            });
        }

        // Get user data
        const user = await findUserById(session.user.id);

        const commentData = {
            id: toStringId(comment?._id),
            content: comment?.content,
            createdAt: comment?.createdAt,
            postId: postId,
            user: {
                id: toStringId(user?._id),
                name: user?.name || null,
                avatar: user?.avatar || null,
                image: user?.image || user?.avatar || null,
            },
        };

        // Get updated comments count
        const commentsCount = postIdObj 
          ? (await postsCollection.findOne({ _id: postIdObj }))?.commentsCount || 0
          : 0;

        // Emit real-time comment creation via Socket.io
        try {
            const io = getSocketInstance();
            if (io) {
                // Notify post owner
                if (post.userId !== session.user.id) {
                    io.to(`user:${post.userId}`).emit("new_comment", commentData);
                }

                // Broadcast to all users viewing this post
                io.to(`post:${postId}`).emit("comment_added", {
                    postId: postId,
                    commentsCount,
                    comment: commentData,
                });
            }
        } catch (error: any) {
            console.warn("⚠️ Could not emit comment socket event:", error?.message);
        }

        return NextResponse.json(commentData, { status: 201 });
    } catch (error: any) {
        console.error("Error creating comment:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// Get comments for a post
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const postId = searchParams.get("postId");

        if (!postId) {
            return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        const comments = await findCommentsByPostId(postId);
        const usersCollection = await getCollection(COLLECTIONS.USERS);

        const formattedComments = await Promise.all(
            comments.map(async (c: any) => {
                const userIdObj = toObjectId(c.userId);
                const user = userIdObj ? await usersCollection.findOne({ _id: userIdObj }) : null;
                return {
                    id: toStringId(c._id),
                    content: c.content,
                    createdAt: c.createdAt,
                    user: {
                        id: toStringId(user?._id),
                        name: user?.name || null,
                        avatar: user?.avatar || null,
                        image: user?.image || user?.avatar || null,
                    },
                };
            })
        );

        return NextResponse.json(formattedComments);
    } catch (error: any) {
        console.error("Error fetching comments:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
