import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { toggleLike, findPostById, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

export async function POST(
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

        const result = await toggleLike(session.user.id, id);

        // Update post likes count
        const postsCollection = await getCollection(COLLECTIONS.POSTS);
        const postIdObj = toObjectId(id);
        if (postIdObj) {
            await postsCollection.updateOne(
                { _id: postIdObj },
                { $inc: { likesCount: result.liked ? 1 : -1 } }
            );
        }

        return NextResponse.json({ liked: result.liked });
    } catch (error: any) {
        console.error("Error toggling like:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
