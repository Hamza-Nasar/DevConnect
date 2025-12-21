import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findPostById, toStringId, toObjectId } from "@/lib/db";
import { getCollection } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/db";

// Report content
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { postId, reason, description } = await req.json();

        if (!postId || !reason) {
            return NextResponse.json({ error: "Post ID and reason required" }, { status: 400 });
        }

        const post = await findPostById(postId);
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        // Store report (you can create a reports collection)
        const reportsCollection = await getCollection("reports");
        await reportsCollection.insertOne({
            postId,
            reportedBy: session.user.id,
            reason,
            description: description || null,
            status: "pending",
            createdAt: new Date(),
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error reporting content:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
