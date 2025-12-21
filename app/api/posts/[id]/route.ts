import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findPostById, deletePost, updatePost, findUserById, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const post = await findPostById(id);
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const usersCollection = await getCollection(COLLECTIONS.USERS);
        const commentsCollection = await getCollection(COLLECTIONS.COMMENTS);
        const likesCollection = await getCollection(COLLECTIONS.LIKES);

        const userIdObj = toObjectId(post.userId);
        const user = userIdObj ? await usersCollection.findOne({ _id: userIdObj }) : null;
        const comments = await commentsCollection.find({ postId: id }).toArray();
        const likesCount = await likesCollection.countDocuments({ postId: id });

        return NextResponse.json({
            id: toStringId(post._id),
            title: post.title || null,
            content: post.content,
            images: post.images || [],
            video: post.video || null,
            hashtags: post.hashtags || [],
            location: post.location || null,
            createdAt: post.createdAt,
            user: {
                id: toStringId(user?._id),
                name: user?.name || null,
                avatar: user?.avatar || null,
                image: user?.image || user?.avatar || null,
            },
            commentsCount: comments.length,
            likesCount: likesCount,
            sharesCount: post.sharesCount || 0,
            viewsCount: post.viewsCount || 0,
        });
    } catch (error: any) {
        console.error("Error fetching post:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const post = await findPostById(id);
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        if (post.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await deletePost(id);

        // Update user's post count
        const usersCollection = await getCollection(COLLECTIONS.USERS);
        const userIdObj = toObjectId(session.user.id);
        if (userIdObj) {
            await usersCollection.updateOne(
                { _id: userIdObj },
                { $inc: { postsCount: -1 } }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting post:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const post = await findPostById(id);
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        if (post.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { content, title, hashtags, location } = body;

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (content !== undefined) updateData.content = content.trim();
        if (title !== undefined) updateData.title = title?.trim() || null;
        if (hashtags !== undefined) updateData.hashtags = hashtags;
        if (location !== undefined) updateData.location = location || null;

        const updatedPost = await updatePost(id, updateData);

        if (!updatedPost) {
            return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
        }

        return NextResponse.json({
            id: toStringId(updatedPost._id),
            content: updatedPost.content,
            title: updatedPost.title,
            hashtags: updatedPost.hashtags,
            location: updatedPost.location,
            updatedAt: updatedPost.updatedAt,
        });
    } catch (error: any) {
        console.error("Error updating post:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
