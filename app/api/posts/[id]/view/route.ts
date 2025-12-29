import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS, toObjectId, toStringId } from "@/lib/db";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        // Get posts collection
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const postId = toObjectId(id);
        
        if (!postId) {
            return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
        }

        // Increment views count
        const result = await postsCollection.findOneAndUpdate(
            { _id: postId },
            { $inc: { viewsCount: 1 } },
            { returnDocument: "after" }
        );

        if (!result) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const newViewsCount = (result as any).viewsCount || 1;

        return NextResponse.json({
            success: true,
            postId: id,
            viewsCount: newViewsCount,
        });
    } catch (error: any) {
        console.error("Error incrementing views:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

