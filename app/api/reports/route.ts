import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCollection } from "@/lib/mongodb";
import { findPostById, toObjectId, toStringId } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { postId, reason } = await req.json();
        if (!postId || !reason?.trim()) {
            return NextResponse.json({ error: "Post ID and reason required" }, { status: 400 });
        }

        const post = await findPostById(postId);
        if (!post) {
            return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }

        const reportsCollection = await getCollection("reports");
        
        // Check if already reported by this user
        const existing = await reportsCollection.findOne({
            postId,
            userId: session.user.id,
        });

        if (existing) {
            return NextResponse.json({ error: "Already reported" }, { status: 400 });
        }

        await reportsCollection.insertOne({
            postId,
            userId: session.user.id,
            reason: reason.trim(),
            createdAt: new Date(),
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error reporting post:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}


