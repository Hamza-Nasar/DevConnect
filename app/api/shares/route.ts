import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createShare, checkUserSharedPost, findPostById, findUserById, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";
import { getSocketInstance } from "@/lib/socket-server";

// Share a post
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { postId, content } = await req.json();
        if (!postId) {
            return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        // Check if already shared
        const existing = await checkUserSharedPost(session.user.id, postId);
        if (existing) {
            return NextResponse.json({ error: "Already shared" }, { status: 400 });
        }

        // Create share
        const share = await createShare({
            postId,
            userId: session.user.id,
            content: content || null,
        });

        // Update share count
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const postIdObj = toObjectId(postId);
        if (postIdObj) {
            await postsCollection.updateOne(
                { _id: postIdObj },
                { $inc: { sharesCount: 1 } }
            );
        }

        // Get user and post data
        const user = await findUserById(session.user.id);
        const post = await findPostById(postId);
        const postUser = post ? await findUserById(post.userId) : null;

        // Get updated share count
        const sharesCount = postIdObj
          ? (await postsCollection.findOne({ _id: postIdObj }))?.sharesCount || 0
          : 0;

        // Emit real-time share update via Socket.io
        try {
            const io = getSocketInstance();
            if (io && post) {
                // Notify post owner
                if (post.userId !== session.user.id) {
                    await getCollection(COLLECTIONS.NOTIFICATIONS).then(notificationsCollection => {
                        notificationsCollection.insertOne({
                            userId: post.userId,
                            type: "share",
                            title: "Post Shared",
                            message: `${user?.name || "Someone"} shared your post`,
                            link: `/feed?post=${postId}`,
                            read: false,
                            createdAt: new Date(),
                        });
                    }).catch(() => {});

                    io.to(`user:${post.userId}`).emit("post_shared", { postId: postId });
                }

                // Broadcast share update to all users viewing this post
                io.to(`post:${postId}`).emit("share_updated", {
                    postId: postId,
                    sharesCount,
                });
            }
        } catch (error: any) {
            console.warn("⚠️ Could not emit share socket event:", error?.message);
        }

        return NextResponse.json({
            id: toStringId(share?._id),
            postId,
            userId: session.user.id,
            content: share?.content || null,
            createdAt: share?.createdAt,
            sharesCount,
            user: {
                id: toStringId(user?._id),
                name: user?.name || null,
                username: user?.username || null,
                avatar: user?.avatar || null,
            },
            post: post ? {
                id: toStringId(post._id),
                user: {
                    id: toStringId(postUser?._id),
                    name: postUser?.name || null,
                    username: postUser?.username || null,
                    avatar: postUser?.avatar || null,
                },
            } : null,
        }, { status: 201 });
    } catch (error: any) {
        console.error("Error sharing post:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// Get shares for a post
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const postId = searchParams.get("postId");

        if (!postId) {
            return NextResponse.json({ error: "Post ID required" }, { status: 400 });
        }

        const sharesCollection = await getCollection(COLLECTIONS.SHARES);
        const shares = await sharesCollection
            .find({ postId })
            .sort({ createdAt: -1 })
            .toArray();

        const usersCollection = await getCollection(COLLECTIONS.USERS);
        const formattedShares = await Promise.all(
            shares.map(async (s: any) => {
                const userIdObj = toObjectId(s.userId);
                const user = userIdObj ? await usersCollection.findOne({ _id: userIdObj }) : null;
                return {
                    id: toStringId(s._id),
                    postId: s.postId,
                    userId: s.userId,
                    content: s.content || null,
                    createdAt: s.createdAt,
                    user: {
                        id: toStringId(user?._id),
                        name: user?.name || null,
                        username: user?.username || null,
                        avatar: user?.avatar || null,
                    },
                };
            })
        );

        return NextResponse.json(formattedShares);
    } catch (error: any) {
        console.error("Error fetching shares:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
