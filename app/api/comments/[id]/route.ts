import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

// Get a single comment
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const commentId = toObjectId(id);
        if (!commentId) {
            return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
        }

        const commentsCollection = await getCollection(COLLECTIONS.COMMENTS);
        const comment = await commentsCollection.findOne({ _id: commentId });

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        const usersCollection = await getCollection(COLLECTIONS.USERS);
        const userIdObj = toObjectId(comment.userId);
        const user = userIdObj ? await usersCollection.findOne({ _id: userIdObj }) : null;

        return NextResponse.json({
            id: toStringId(comment._id),
            content: comment.content,
            createdAt: comment.createdAt,
            user: {
                id: toStringId(user?._id),
                name: user?.name || null,
                avatar: user?.avatar || null,
                image: user?.image || user?.avatar || null,
            },
        });
    } catch (error: any) {
        console.error("Error fetching comment:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// Update a comment
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { content } = await req.json();
        if (!content?.trim()) {
            return NextResponse.json({ error: "Content required" }, { status: 400 });
        }

        const { id } = await params;
        const commentId = toObjectId(id);
        if (!commentId) {
            return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
        }

        const commentsCollection = await getCollection(COLLECTIONS.COMMENTS);
        const comment = await commentsCollection.findOne({ _id: commentId });

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        // Check if user owns the comment
        if (comment.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await commentsCollection.updateOne(
            { _id: commentId },
            { $set: { content: content.trim(), updatedAt: new Date() } }
        );

        const updatedComment = await commentsCollection.findOne({ _id: commentId });
        const usersCollection = await getCollection(COLLECTIONS.USERS);
        const userIdObj = toObjectId(comment.userId);
        const user = userIdObj ? await usersCollection.findOne({ _id: userIdObj }) : null;

        return NextResponse.json({
            id: toStringId(updatedComment?._id),
            content: updatedComment?.content,
            createdAt: updatedComment?.createdAt,
            user: {
                id: toStringId(user?._id),
                name: user?.name || null,
                avatar: user?.avatar || null,
                image: user?.image || user?.avatar || null,
            },
        });
    } catch (error: any) {
        console.error("Error updating comment:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// Delete a comment
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
        const commentId = toObjectId(id);
        if (!commentId) {
            return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
        }

        const commentsCollection = await getCollection(COLLECTIONS.COMMENTS);
        const comment = await commentsCollection.findOne({ _id: commentId });

        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        // Check if user owns the comment
        if (comment.userId !== session.user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await commentsCollection.deleteOne({ _id: commentId });

        // Decrement post comments count
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const postIdObj = toObjectId(comment.postId);
        if (postIdObj) {
            await postsCollection.updateOne(
                { _id: postIdObj },
                { $inc: { commentsCount: -1 } }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting comment:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
