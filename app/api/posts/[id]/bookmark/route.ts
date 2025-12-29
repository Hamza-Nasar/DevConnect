import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { toObjectId, toStringId, COLLECTIONS } from "@/lib/db";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        let tags = [];
        try {
            const body = await req.json();
            tags = body.tags || [];
        } catch (error) {
            // Body might be empty, that's okay
        }

        if (!id) {
            return NextResponse.json(
                { error: "Post ID is required" },
                { status: 400 }
            );
        }

        const bookmarksCollection = await getCollection(COLLECTIONS.BOOKMARKS);
        const postsCollection = await getCollection("posts");

        // Verify post exists
        const postIdObj = toObjectId(id);
        if (!postIdObj) {
            return NextResponse.json(
                { error: "Invalid post ID" },
                { status: 400 }
            );
        }

        const post = await postsCollection.findOne({ _id: postIdObj });
        if (!post) {
            return NextResponse.json(
                { error: "Post not found" },
                { status: 404 }
            );
        }

        // Check if already bookmarked (try both string and ObjectId)
        let existing = await bookmarksCollection.findOne({
            userId: session.user.id.toString(),
            postId: id.toString()
        });

        // If not found, try with ObjectId
        if (!existing) {
            existing = await bookmarksCollection.findOne({
                userId: session.user.id.toString(),
                postId: postIdObj
            });
        }

        if (existing) {
            // Update tags if provided
            if (tags) {
                await bookmarksCollection.updateOne(
                    { _id: existing._id },
                    { $set: { tags, updatedAt: new Date().toISOString() } }
                );
            }

            // Already bookmarked, don't increment count
            return NextResponse.json({ success: true, bookmarked: true });
        }

        await bookmarksCollection.insertOne({
            userId: session.user.id.toString(),
            postId: id.toString(),
            tags: tags || [],
            savedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        });

        // Update post bookmarks count
        await postsCollection.updateOne(
            { _id: postIdObj },
            { $inc: { bookmarksCount: 1 } }
        );

        return NextResponse.json({ success: true, bookmarked: true });
    } catch (error: any) {
        console.error("Error bookmarking post:", error);
        return NextResponse.json(
            { error: "Failed to bookmark post" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: "Post ID is required" },
                { status: 400 }
            );
        }

        const bookmarksCollection = await getCollection(COLLECTIONS.BOOKMARKS);
        const postsCollection = await getCollection("posts");

        const postIdObj = toObjectId(id);
        if (!postIdObj) {
            return NextResponse.json(
                { error: "Invalid post ID" },
                { status: 400 }
            );
        }

        // Try to delete with string postId first
        let result = await bookmarksCollection.deleteOne({
            userId: session.user.id.toString(),
            postId: id.toString()
        });

        // If not found, try with ObjectId
        if (result.deletedCount === 0) {
            result = await bookmarksCollection.deleteOne({
                userId: session.user.id.toString(),
                postId: postIdObj
            });
        }

        if (result.deletedCount > 0) {
            // Update post bookmarks count (ensure it doesn't go below 0)
            await postsCollection.updateOne(
                { _id: postIdObj },
                { $inc: { bookmarksCount: -1 } }
            );

            // Ensure bookmarksCount doesn't go below 0
            const updatedPost = await postsCollection.findOne({ _id: postIdObj });
            if (updatedPost && updatedPost.bookmarksCount < 0) {
                await postsCollection.updateOne(
                    { _id: postIdObj },
                    { $set: { bookmarksCount: 0 } }
                );
            }
        }

        return NextResponse.json({ success: true, bookmarked: false });
    } catch (error: any) {
        console.error("Error unbookmarking post:", error);
        return NextResponse.json(
            { error: "Failed to unbookmark post" },
            { status: 500 }
        );
    }
}
